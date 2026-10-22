/**
 * Web Push (app pelo navegador): inscrições e lembretes agendados são estritamente individuais,
 * e o servidor envia cada lembrete uma única vez, cifrado para o navegador da pessoa.
 */
import { createECDH, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

import { b64urlEncode, buildWebPushRequest } from '../functions/_shared/web-push';
import { adminClient, anonClient, createUser, withDb } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ece = require('http_ece') as {
  decrypt: (body: Buffer, params: { version: string; privateKey: unknown; authSecret: Buffer }) => Buffer;
};

function browser() {
  const ua = createECDH('prime256v1');
  ua.generateKeys();
  const auth = randomBytes(16);
  return {
    ua,
    auth,
    subscription: {
      endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
      p256dh: b64urlEncode(new Uint8Array(ua.getPublicKey())),
      auth: b64urlEncode(new Uint8Array(auth)),
    },
  };
}

const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

describe('inscrições de Web Push', () => {
  it('cada pessoa vê só a própria inscrição; trocar de conta move a inscrição', async () => {
    const [ana, bruno] = await Promise.all([createUser('Ana'), createUser('Bruno')]);
    const { subscription } = browser();
    const register = (client: typeof ana.client) =>
      client.rpc('register_web_push', {
        p_endpoint: subscription.endpoint,
        p_p256dh: subscription.p256dh,
        p_auth: subscription.auth,
      });

    expect((await register(ana.client)).error).toBeNull();
    expect((await ana.client.from('web_push_subscriptions').select('endpoint')).data).toEqual([
      { endpoint: subscription.endpoint },
    ]);
    expect((await bruno.client.from('web_push_subscriptions').select('endpoint')).data).toEqual([]);

    expect((await register(bruno.client)).error).toBeNull();
    expect((await ana.client.from('web_push_subscriptions').select('endpoint')).data).toEqual([]);

    // Só remove a própria.
    await ana.client.rpc('unregister_web_push', { p_endpoint: subscription.endpoint });
    expect((await bruno.client.from('web_push_subscriptions').select('endpoint')).data).toHaveLength(1);
  });

  it('recusa endereços que não são https, chaves inválidas e anônimos', async () => {
    const ana = await createUser('Ana');
    const { subscription } = browser();
    const bad = await ana.client.rpc('register_web_push', {
      p_endpoint: 'http://evil.example/push',
      p_p256dh: subscription.p256dh,
      p_auth: subscription.auth,
    });
    expect(bad.error).not.toBeNull();
    const badKey = await ana.client.rpc('register_web_push', {
      p_endpoint: subscription.endpoint,
      p_p256dh: 'curta',
      p_auth: subscription.auth,
    });
    expect(badKey.error).not.toBeNull();
    const anon = await anonClient().rpc('register_web_push', {
      p_endpoint: subscription.endpoint,
      p_p256dh: subscription.p256dh,
      p_auth: subscription.auth,
    });
    expect(anon.error).not.toBeNull();
  });

  it('ninguém grava direto na tabela (só pelas funções)', async () => {
    const ana = await createUser('Ana');
    const { subscription } = browser();
    const { error } = await ana.client.from('web_push_subscriptions').insert({
      user_id: ana.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    });
    expect(error).not.toBeNull();
  });
});

describe('lembretes agendados', () => {
  it('a lista nova substitui a anterior, ignora o passado e é individual', async () => {
    const [ana, bruno] = await Promise.all([createUser('Ana'), createUser('Bruno')]);
    const first = await ana.client.rpc('replace_scheduled_pushes', {
      p_items: [
        {
          key: 'event:a:1',
          fire_at: inMinutes(30),
          title: 'Lembrete do DuoDay',
          body: 'x',
          href: '/event/a',
        },
        { key: 'event:b:1', fire_at: inMinutes(-5), title: 'Passado', body: 'x', href: '/event/b' },
      ],
    });
    expect(first.error).toBeNull();
    expect((await ana.client.from('scheduled_pushes').select('reminder_key')).data).toEqual([
      { reminder_key: 'event:a:1' },
    ]);

    await ana.client.rpc('replace_scheduled_pushes', {
      p_items: [{ key: 'bill:c:1', fire_at: inMinutes(60), title: 'Conta', body: 'x', href: '/bill/c' }],
    });
    expect((await ana.client.from('scheduled_pushes').select('reminder_key')).data).toEqual([
      { reminder_key: 'bill:c:1' },
    ]);
    expect((await bruno.client.from('scheduled_pushes').select('reminder_key')).data).toEqual([]);
  });

  it('recusa listas grandes demais e links para fora do app', async () => {
    const ana = await createUser('Ana');
    const many = Array.from({ length: 61 }, (_, i) => ({
      key: `e:${i}`,
      fire_at: inMinutes(10 + i),
      title: 't',
      body: 'b',
      href: '/',
    }));
    expect((await ana.client.rpc('replace_scheduled_pushes', { p_items: many })).error).not.toBeNull();
    const external = await ana.client.rpc('replace_scheduled_pushes', {
      p_items: [{ key: 'e:1', fire_at: inMinutes(10), title: 't', body: 'b', href: 'https://evil.example' }],
    });
    expect(external.error).not.toBeNull();
  });

  it('só o servidor pega os vencidos, e cada lembrete sai uma única vez', async () => {
    const ana = await createUser('Ana');
    await ana.client.rpc('replace_scheduled_pushes', {
      p_items: [{ key: 'event:due:1', fire_at: inMinutes(1), title: 'Agora', body: 'b', href: '/event/due' }],
    });
    // Simula a hora chegando.
    await withDb((db) =>
      db.query(
        `update public.scheduled_pushes set fire_at = now() - interval '10 seconds' where user_id = $1`,
        [ana.id],
      ),
    );

    expect((await ana.client.rpc('claim_due_web_pushes')).error).not.toBeNull();

    const admin = adminClient();
    const firstClaim = await admin.rpc('claim_due_web_pushes');
    expect(firstClaim.error).toBeNull();
    const mine = (firstClaim.data as { user_id: string; reminder_key: string }[]).filter(
      (r) => r.user_id === ana.id,
    );
    expect(mine.map((r) => r.reminder_key)).toEqual(['event:due:1']);

    const secondClaim = await admin.rpc('claim_due_web_pushes');
    expect((secondClaim.data as { user_id: string }[]).filter((r) => r.user_id === ana.id)).toEqual([]);
  });
});

describe('envio', () => {
  it('o "serviço de push" recebe o aviso cifrado, e só o navegador da pessoa decifra', async () => {
    const { ua, auth, subscription } = browser();
    const received: { headers: IncomingMessage['headers']; body: Buffer }[] = [];
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        received.push({ headers: req.headers, body: Buffer.concat(chunks) });
        res.writeHead(201).end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    const vapidPair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
    ])) as CryptoKeyPair;
    const vapid = {
      publicKey: b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', vapidPair.publicKey))),
      privateKey: (await crypto.subtle.exportKey('jwk', vapidPair.privateKey)).d as string,
      subject: 'mailto:ajuda@duoday.com.br',
    };
    const message = {
      title: 'Lembrete do DuoDay',
      body: 'Você tem um compromisso chegando.',
      href: '/event/x',
    };
    const request = await buildWebPushRequest(
      { ...subscription, endpoint: `http://127.0.0.1:${port}/push/abc` },
      message,
      vapid,
    );
    await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: request.body.slice().buffer as ArrayBuffer,
    });
    server.close();

    expect(received).toHaveLength(1);
    const [push] = received as [{ headers: IncomingMessage['headers']; body: Buffer }];
    expect(push.headers['content-encoding']).toBe('aes128gcm');
    expect(push.headers.authorization).toMatch(/^vapid t=.+, k=/);
    expect(push.body.includes(Buffer.from('compromisso'))).toBe(false);
    const plain = ece.decrypt(push.body, { version: 'aes128gcm', privateKey: ua, authSecret: auth });
    expect(JSON.parse(plain.toString('utf8'))).toEqual(message);
  });
});
