/**
 * Tokens de push e tempo real: nenhum dado atravessa de um casal para outro.
 */
import { randomUUID } from 'node:crypto';

import type { RealtimeChannel } from '@supabase/supabase-js';

import { anonClient, connect, createUser, timedEvent, withDb, type TestUser } from './helpers';

describe('tokens de push', () => {
  it('um token pertence a uma conta por vez (troca de conta no mesmo celular)', async () => {
    const [ana, bruno] = await Promise.all([createUser('Ana'), createUser('Bruno')]);
    const token = `ExponentPushToken[${randomUUID()}]`;

    expect(
      (await ana.client.rpc('register_push_token', { p_token: token, p_platform: 'ios' })).error,
    ).toBeNull();
    expect((await ana.client.from('push_tokens').select('token')).data).toEqual([{ token }]);

    expect(
      (await bruno.client.rpc('register_push_token', { p_token: token, p_platform: 'ios' })).error,
    ).toBeNull();
    expect((await ana.client.from('push_tokens').select('token')).data).toEqual([]);
    expect((await bruno.client.from('push_tokens').select('token')).data).toEqual([{ token }]);
  });

  it('só remove o próprio token', async () => {
    const [ana, bruno] = await Promise.all([createUser('Ana'), createUser('Bruno')]);
    const token = `ExponentPushToken[${randomUUID()}]`;
    await ana.client.rpc('register_push_token', { p_token: token, p_platform: 'android' });
    await bruno.client.rpc('unregister_push_token', { p_token: token });
    const rows = await withDb((db) =>
      db.query('select user_id from public.push_tokens where token = $1', [token]),
    );
    expect(rows.rows).toEqual([{ user_id: ana.id }]);
  });

  it('recusa entradas inválidas e usuários anônimos', async () => {
    const ana = await createUser('Ana');
    expect(
      (await ana.client.rpc('register_push_token', { p_token: 'x', p_platform: 'ios' })).error,
    ).not.toBeNull();
    expect(
      (await ana.client.rpc('register_push_token', { p_token: 'ExponentPushToken[abc]', p_platform: 'web' }))
        .error,
    ).not.toBeNull();
    expect(
      (
        await anonClient().rpc('register_push_token', {
          p_token: 'ExponentPushToken[abc]',
          p_platform: 'ios',
        })
      ).error,
    ).not.toBeNull();
  });

  it('o gatilho de aviso ao parceiro nunca impede salvar (sem configuração no ambiente)', async () => {
    const [ana, bruno] = await Promise.all([createUser('Ana'), createUser('Bruno')]);
    const coupleId = await connect(ana, bruno);
    const { error } = await ana.client.from('events').insert(timedEvent(coupleId));
    expect(error).toBeNull();
  });
});

function listen(user: TestUser, coupleId: string) {
  const received: unknown[] = [];
  let channel: RealtimeChannel;
  const ready = new Promise<void>((resolve, reject) => {
    channel = user.client
      .channel(`test:${randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `couple_id=eq.${coupleId}` },
        (p) => received.push(p),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(status));
      });
  });
  return { received, ready, stop: () => user.client.removeChannel(channel) };
}

describe('tempo real', () => {
  it('o parceiro recebe o aviso; outro casal não recebe nada, mesmo pedindo', async () => {
    const [ana, bruno, carla] = await Promise.all([
      createUser('Ana'),
      createUser('Bruno'),
      createUser('Carla'),
    ]);
    const coupleA = await connect(ana, bruno);
    await Promise.all([bruno.client.realtime.setAuth(), carla.client.realtime.setAuth()]);

    const brunoListens = listen(bruno, coupleA);
    const carlaSnoops = listen(carla, coupleA); // tenta ouvir o casal A
    await Promise.all([brunoListens.ready, carlaSnoops.ready]);

    await ana.client.from('events').insert(timedEvent(coupleA, { title: 'Segredo do casal A' }));
    await new Promise((r) => setTimeout(r, 2500));

    expect(brunoListens.received.length).toBeGreaterThanOrEqual(1);
    expect(carlaSnoops.received).toEqual([]);

    await Promise.all([brunoListens.stop(), carlaSnoops.stop()]);
  });
});
