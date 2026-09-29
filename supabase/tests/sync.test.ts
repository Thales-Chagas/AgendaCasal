/**
 * Sincronização ponta a ponta: dois aparelhos (Ana e Bruno), cada um com sua cópia
 * local (SQLite em memória), conversando com o Supabase local real.
 */
import { randomUUID } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createNodeSqlDatabase } from '../../src/core/storage/testing/node-sql';
import type { CalendarEvent } from '../../src/features/events/domain/types';
import type { EntityName } from '../../src/features/sync/entities';
import { createLocalStore, type LocalStore } from '../../src/features/sync/local-store';
import { createSupabaseRemoteSource, type RemoteSource } from '../../src/features/sync/remote-source';
import { createSyncEngine, type ConflictInfo, type RejectedInfo } from '../../src/features/sync/sync-engine';
import { createSyncedMutations } from '../../src/features/sync/synced-mutations';
import { eventFields } from '../../src/features/sync/testing/fixtures';
import { connect, createUser, type TestUser } from './helpers';

/** Simula perda de conexão: toda chamada remota falha como erro de rede. */
function offlineSwitch(remote: RemoteSource) {
  let offline = false;
  const wrapped = Object.fromEntries(
    Object.entries(remote).map(([key, fn]) => [
      key,
      (...args: unknown[]) =>
        offline
          ? Promise.reject(new TypeError('Network request failed'))
          : (fn as (...a: unknown[]) => unknown)(...args),
    ]),
  ) as unknown as RemoteSource;
  return { remote: wrapped, setOffline: (value: boolean) => (offline = value) };
}

type Device = {
  user: TestUser;
  local: LocalStore;
  events: ReturnType<typeof createSyncedMutations<'events'>>;
  sync: () => Promise<{ ok: boolean; offline: boolean; pending: number }>;
  setOffline: (value: boolean) => void;
  conflicts: ConflictInfo[];
  rejected: RejectedInfo[];
  changed: EntityName[];
  get: (id: string) => Promise<CalendarEvent | null>;
};

async function device(user: TestUser, coupleId: string): Promise<Device> {
  const local = await createLocalStore(createNodeSqlDatabase());
  const { remote, setOffline } = offlineSwitch(createSupabaseRemoteSource(user.client as SupabaseClient));
  const conflicts: ConflictInfo[] = [];
  const rejected: RejectedInfo[] = [];
  const changed: EntityName[] = [];
  const engine = createSyncEngine({
    local,
    remote,
    onConflict: (c) => conflicts.push(c),
    onRejected: (r) => rejected.push(r),
    onDataChanged: (set) => changed.push(...set),
  });
  const events = createSyncedMutations('events', {
    local,
    context: () => ({ userId: user.id, coupleId }),
    newId: randomUUID,
    afterChange: () => undefined,
  });
  return {
    user,
    local,
    events,
    sync: engine.sync,
    setOffline,
    conflicts,
    rejected,
    changed,
    get: (id) => local.get('events', id),
  };
}

let anaPhone: Device;
let brunoPhone: Device;

beforeEach(async () => {
  const [ana, bruno] = await Promise.all([createUser('Ana'), createUser('Bruno')]);
  const coupleId = await connect(ana, bruno);
  anaPhone = await device(ana, coupleId);
  brunoPhone = await device(bruno, coupleId);
  await Promise.all([anaPhone.sync(), brunoPhone.sync()]);
});

it('compromisso criado por um aparece no aparelho do outro', async () => {
  const created = await anaPhone.events.create(eventFields({ title: 'Cinema' }));
  expect((await anaPhone.get(created.id))?.version).toBe(0); // ainda não enviado

  await anaPhone.sync();
  expect((await anaPhone.get(created.id))?.version).toBe(1);

  await brunoPhone.sync();
  expect((await brunoPhone.get(created.id))?.title).toBe('Cinema');
  expect(brunoPhone.changed).toContain('events');
});

it('edição e exclusão chegam ao parceiro', async () => {
  const created = await anaPhone.events.create(eventFields({ title: 'Jantar' }));
  await anaPhone.sync();
  await brunoPhone.sync();

  await brunoPhone.events.update(created.id, { title: 'Jantar às 21h' });
  await brunoPhone.sync();
  await anaPhone.sync();
  expect((await anaPhone.get(created.id))?.title).toBe('Jantar às 21h');

  await anaPhone.events.remove(created.id);
  await anaPhone.sync();
  await brunoPhone.sync();
  expect((await brunoPhone.get(created.id))?.deletedAt).not.toBeNull();
});

it('funciona sem internet e envia quando a conexão volta', async () => {
  anaPhone.setOffline(true);
  const created = await anaPhone.events.create(eventFields({ title: 'Mercado' }));
  await anaPhone.events.update(created.id, { location: 'Feira' });

  const offlineResult = await anaPhone.sync();
  expect(offlineResult).toMatchObject({ offline: true, pending: 1 }); // create + update viram um só envio
  expect((await anaPhone.get(created.id))?.location).toBe('Feira'); // visível localmente

  anaPhone.setOffline(false);
  expect(await anaPhone.sync()).toMatchObject({ ok: true, pending: 0 });

  await brunoPhone.sync();
  expect(await brunoPhone.get(created.id)).toMatchObject({ title: 'Mercado', location: 'Feira', version: 1 });
});

it('reenvio após perda de resposta não duplica o compromisso', async () => {
  const created = await anaPhone.events.create(eventFields({ title: 'Consulta' }));
  // Simula: o servidor recebeu, mas o celular não soube (resposta perdida).
  await anaPhone.user.client.from('events').insert({
    id: created.id,
    couple_id: created.coupleId,
    title: 'Consulta',
    starts_at: created.startsAt,
    ends_at: created.endsAt,
  });
  expect(await anaPhone.sync()).toMatchObject({ ok: true, pending: 0 });
  const { data } = await anaPhone.user.client.from('events').select('id').eq('id', created.id);
  expect(data).toHaveLength(1);
});

it('conflito: edições em campos diferentes são combinadas', async () => {
  const created = await anaPhone.events.create(eventFields({ title: 'Viagem' }));
  await anaPhone.sync();
  await brunoPhone.sync();

  await anaPhone.events.update(created.id, { location: 'Praia' });
  await brunoPhone.events.update(created.id, { title: 'Viagem de aniversário' });

  await brunoPhone.sync(); // Bruno envia primeiro
  await anaPhone.sync(); // Ana encontra versão nova e combina
  await brunoPhone.sync();

  const expected = { title: 'Viagem de aniversário', location: 'Praia' };
  expect(await anaPhone.get(created.id)).toMatchObject(expected);
  expect(await brunoPhone.get(created.id)).toMatchObject(expected);
  expect(anaPhone.conflicts).toEqual([{ entity: 'events', id: created.id, kind: 'merged' }]);
});

it('conflito: no mesmo campo vence o último envio', async () => {
  const created = await anaPhone.events.create(eventFields({ title: 'Jantar' }));
  await anaPhone.sync();
  await brunoPhone.sync();

  await brunoPhone.events.update(created.id, { title: 'Jantar (Bruno)' });
  await anaPhone.events.update(created.id, { title: 'Jantar (Ana)' });
  await brunoPhone.sync();
  await anaPhone.sync();
  await brunoPhone.sync();

  expect((await brunoPhone.get(created.id))?.title).toBe('Jantar (Ana)');
});

it('conflito: exclusão vence edição', async () => {
  const created = await anaPhone.events.create(eventFields({ title: 'Reunião' }));
  await anaPhone.sync();
  await brunoPhone.sync();

  await anaPhone.events.remove(created.id);
  await anaPhone.sync();

  await brunoPhone.events.update(created.id, { title: 'Reunião remarcada' });
  await brunoPhone.sync();

  expect((await brunoPhone.get(created.id))?.deletedAt).not.toBeNull();
  expect(brunoPhone.conflicts).toEqual([{ entity: 'events', id: created.id, kind: 'deleted_remotely' }]);
});

it('desfazer exclusão antes e depois do envio', async () => {
  const created = await anaPhone.events.create(eventFields({ title: 'Academia' }));
  await anaPhone.sync();

  const undoLocal = await anaPhone.events.remove(created.id);
  await undoLocal();
  expect((await anaPhone.get(created.id))?.deletedAt).toBeNull();
  expect(await anaPhone.local.pendingCount()).toBe(0);

  const undoRemote = await anaPhone.events.remove(created.id);
  await anaPhone.sync();
  await undoRemote();
  await anaPhone.sync();
  await brunoPhone.sync();
  expect((await brunoPhone.get(created.id))?.deletedAt).toBeNull();
});

it('alteração recusada pelo servidor é desfeita localmente (sem travar a fila)', async () => {
  const created = await anaPhone.events.create(eventFields({ title: 'Ok' }));
  await anaPhone.sync();
  // Responsável de fora do casal: a RLS/trigger recusa.
  await anaPhone.events.update(created.id, { ownerScope: 'person', responsibleUserId: randomUUID() });
  const other = await anaPhone.events.create(eventFields({ title: 'Depois' }));

  expect(await anaPhone.sync()).toMatchObject({ ok: true, pending: 0 });
  expect(anaPhone.rejected).toEqual([{ entity: 'events', id: created.id, code: 'permission' }]);
  expect((await anaPhone.get(created.id))?.ownerScope).toBe('couple');
  expect((await anaPhone.get(other.id))?.version).toBe(1);
});

it('edição feita durante o envio não se perde', async () => {
  const created = await anaPhone.events.create(eventFields({ title: 'A' }));
  await anaPhone.sync();
  await anaPhone.events.update(created.id, { title: 'B' });
  const pushing = anaPhone.sync();
  await anaPhone.events.update(created.id, { title: 'C' });
  await pushing;
  await anaPhone.sync();
  await brunoPhone.sync();
  expect((await brunoPhone.get(created.id))?.title).toBe('C');
});
