/**
 * Confere a criptografia do Web Push (supabase/functions/_shared/web-push.ts) contra uma
 * implementação independente (`http_ece`, a mesma usada pela biblioteca `web-push` do Node):
 * se o navegador não conseguir decifrar, o lembrete simplesmente não aparece.
 */
import { createECDH, randomBytes, webcrypto } from 'node:crypto';

import {
  b64urlDecode,
  b64urlEncode,
  buildWebPushRequest,
  encryptPayload,
  vapidAuthorization,
} from '../../../supabase/functions/_shared/web-push';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ece = require('http_ece') as {
  decrypt: (body: Buffer, params: { version: string; privateKey: unknown; authSecret: Buffer }) => Buffer;
};

beforeAll(() => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
});

function browserSubscription() {
  const ua = createECDH('prime256v1');
  ua.generateKeys();
  const auth = randomBytes(16);
  return {
    ua,
    auth,
    subscription: {
      endpoint: 'https://web.push.apple.com/QGuQyavXutnMx',
      p256dh: b64urlEncode(new Uint8Array(ua.getPublicKey())),
      auth: b64urlEncode(new Uint8Array(auth)),
    },
  };
}

async function vapidKeys() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicKey = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  return { pair, keys: { publicKey, privateKey: jwk.d as string, subject: 'mailto:ajuda@duoday.com.br' } };
}

describe('Web Push', () => {
  it('o navegador consegue decifrar o lembrete (aes128gcm, RFC 8291)', async () => {
    const { ua, auth, subscription } = browserSubscription();
    const message = { title: 'Jantar hoje às 20h 🍝', body: 'Nosso compromisso ❤️', href: '/event/abc' };
    const body = await encryptPayload(subscription, new TextEncoder().encode(JSON.stringify(message)));

    const plain = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: ua, authSecret: auth });
    expect(JSON.parse(plain.toString('utf8'))).toEqual(message);
  });

  it('o serviço de push não consegue ler o conteúdo', async () => {
    const { subscription } = browserSubscription();
    const body = await encryptPayload(subscription, new TextEncoder().encode('Comprar o presente'));
    expect(Buffer.from(body).includes(Buffer.from('presente'))).toBe(false);
  });

  it('assina o pedido com VAPID (JWT ES256 válido para a origem do serviço)', async () => {
    const { pair, keys } = await vapidKeys();
    const header = await vapidAuthorization('https://web.push.apple.com/abc', keys, Date.UTC(2026, 9, 22));
    const match = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, head, claims, signature, k] = match as unknown as string[];
    expect(k).toBe(keys.publicKey);

    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(claims as string)));
    expect(payload).toMatchObject({ aud: 'https://web.push.apple.com', sub: 'mailto:ajuda@duoday.com.br' });
    expect(payload.exp).toBe(Date.UTC(2026, 9, 22) / 1000 + 12 * 3600);

    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      b64urlDecode(signature as string).slice().buffer as ArrayBuffer,
      new TextEncoder().encode(`${head}.${claims}`),
    );
    expect(valid).toBe(true);
  });

  it('monta o pedido com os cabeçalhos exigidos', async () => {
    const { keys } = await vapidKeys();
    const { subscription } = browserSubscription();
    const request = await buildWebPushRequest(subscription, { title: 'x' }, keys, { topic: 'event:1/2' });
    expect(request.url).toBe(subscription.endpoint);
    expect(request.headers).toMatchObject({
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      Urgency: 'high',
      Topic: 'event12',
    });
  });
});
