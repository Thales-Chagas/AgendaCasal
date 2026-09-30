import { toAppError, type AppErrorCode } from '@/core/errors/app-error';
import { logger } from '@/core/logging/logger';

import { entityConfigs, type EntityName, type SyncedEntity } from './entities';
import type { LocalStore, OutboxItem } from './local-store';
import type { RemoteSource } from './remote-source';

const ENTITIES: EntityName[] = ['events', 'special_dates', 'bills'];
const PAGE_SIZE = 500;
/** Margem para transações que confirmaram fora de ordem no servidor. */
const CURSOR_OVERLAP_MS = 60_000;
const MAX_ATTEMPTS = 5;

export type ConflictInfo = { entity: EntityName; id: string; kind: 'merged' | 'deleted_remotely' };
export type RejectedInfo = { entity: EntityName; id: string; code: AppErrorCode };

export type SyncEngineDeps = {
  local: LocalStore;
  remote: RemoteSource;
  onDataChanged?: (entities: ReadonlySet<EntityName>) => void;
  onConflict?: (info: ConflictInfo) => void;
  onRejected?: (info: RejectedInfo) => void;
};

export type SyncResult = { ok: boolean; offline: boolean; pending: number };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const DROP_CODES = new Set<AppErrorCode>(['permission', 'validation', 'not_found']);

/**
 * Sincronização da agenda:
 *   push: envia a fila local (criações, edições, exclusões), com controle de versão;
 *   pull: baixa só o que mudou desde o último cursor (inclui exclusões).
 * Conflitos (dois celulares editando o mesmo item) são resolvidos por campo.
 */
export function createSyncEngine(deps: SyncEngineDeps) {
  const { local, remote } = deps;
  let running: Promise<SyncResult> | null = null;
  let rerun = false;

  const put = async (
    entity: EntityName,
    row: Parameters<(typeof entityConfigs)[EntityName]['fromServer']>[0],
  ) => {
    const value = entityConfigs[entity].fromServer(row);
    await local.put(entity, value as never);
    return value;
  };

  async function revertToServer(entity: EntityName, id: string) {
    const server = await remote.fetchById(entity, id).catch(() => null);
    if (server) await put(entity, server);
    else await local.remove(entity, id);
  }

  /** Resolve um update que encontrou outra versão no servidor. */
  async function resolveConflict(item: OutboxItem, changed: Set<EntityName>): Promise<void> {
    const config = entityConfigs[item.entity];
    for (let attempt = 0; attempt < 3; attempt++) {
      const serverRow = await remote.fetchById(item.entity, item.entityId);
      if (!serverRow || serverRow.deleted_at) {
        // Excluído no outro aparelho: exclusão vence edição.
        await local.ack(item.seq);
        if (serverRow) await put(item.entity, serverRow);
        else await local.remove(item.entity, item.entityId);
        changed.add(item.entity);
        deps.onConflict?.({ entity: item.entity, id: item.entityId, kind: 'deleted_remotely' });
        return;
      }
      const server = config.fromServer(serverRow) as unknown as Record<string, unknown>;
      const merged: Record<string, unknown> = {};
      for (const [field, ours] of Object.entries(item.patch)) {
        // Campos que só o outro aparelho alterou ficam como estão (não estão no patch).
        // Campos que nós alteramos: se o servidor já tem o mesmo valor, nada a fazer;
        // se ambos alteraram, vale o envio mais recente (o nosso).
        if (!same(server[field], ours)) merged[field] = ours;
      }
      const updated = Object.keys(merged).length
        ? await remote.updateIfVersion(
            item.entity,
            item.entityId,
            serverRow.version,
            config.toServer(merged as never),
          )
        : serverRow;
      if (updated) {
        const confirmed = config.fromServer(updated);
        if (await local.ackIfUnchanged(item, confirmed)) await local.put(item.entity, confirmed as never);
        changed.add(item.entity);
        deps.onConflict?.({ entity: item.entity, id: item.entityId, kind: 'merged' });
        return;
      }
    }
    throw new Error('conflict retry limit');
  }

  async function pushItem(item: OutboxItem, changed: Set<EntityName>): Promise<void> {
    const config = entityConfigs[item.entity];
    switch (item.op) {
      case 'create': {
        const row = await remote.insert(item.entity, config.toServer(item.patch as never));
        const confirmed = config.fromServer(row);
        if (await local.ackIfUnchanged(item, confirmed)) await local.put(item.entity, confirmed as never);
        changed.add(item.entity);
        return;
      }
      case 'update': {
        const baseVersion = item.base?.version ?? 0;
        const row = await remote.updateIfVersion(
          item.entity,
          item.entityId,
          baseVersion,
          config.toServer(item.patch as never),
        );
        if (!row) return resolveConflict(item, changed);
        const confirmed = config.fromServer(row);
        if (await local.ackIfUnchanged(item, confirmed)) await local.put(item.entity, confirmed as never);
        changed.add(item.entity);
        return;
      }
      case 'delete': {
        const row = await remote.softDelete(item.entity, item.entityId);
        await local.ack(item.seq);
        if (row) await put(item.entity, row);
        else await local.remove(item.entity, item.entityId);
        changed.add(item.entity);
        return;
      }
    }
  }

  async function push(changed: Set<EntityName>): Promise<{ offline: boolean }> {
    for (const item of await local.outbox()) {
      try {
        await pushItem(item, changed);
      } catch (error) {
        const appError = toAppError(error);
        if (appError.code === 'network') return { offline: true };
        const giveUp = DROP_CODES.has(appError.code) || item.attempts + 1 >= MAX_ATTEMPTS;
        logger.warn('Sync push failed', { entity: item.entity, op: item.op, code: appError.code, giveUp });
        if (giveUp) {
          await local.ack(item.seq);
          await revertToServer(item.entity, item.entityId);
          changed.add(item.entity);
          deps.onRejected?.({ entity: item.entity, id: item.entityId, code: appError.code });
        } else {
          await local.markAttempt(item.seq);
        }
      }
    }
    return { offline: false };
  }

  async function pull(changed: Set<EntityName>): Promise<void> {
    const { coupleId, epoch } = await remote.getSyncEpoch();
    const storedCouple = await local.getState('coupleId');
    const storedEpoch = await local.getState('epoch');
    if (storedCouple !== coupleId || storedEpoch !== String(epoch)) {
      // Mudou de casal ou o servidor pediu uma sincronização completa.
      await local.clearData();
      await local.setState('coupleId', coupleId);
      await local.setState('epoch', String(epoch));
      ENTITIES.forEach((e) => changed.add(e));
    }

    for (const entity of ENTITIES) {
      const cursor = await local.getState(`cursor:${entity}`);
      let since = cursor ? new Date(Date.parse(cursor) - CURSOR_OVERLAP_MS).toISOString() : null;
      let maxSeen = cursor;
      for (;;) {
        const rows = await remote.pullChanges(entity, since, PAGE_SIZE);
        for (const row of rows) {
          if (row.couple_id !== coupleId) continue;
          if (await local.hasPending(entity, row.id)) continue; // o envio pendente resolve depois
          const current = (await local.get(entity, row.id)) as SyncedEntity | null;
          if (current && current.version >= row.version && current.updatedAt === row.updated_at) continue;
          if (current && current.version > row.version) continue;
          await put(entity, row);
          changed.add(entity);
        }
        const last = rows[rows.length - 1]?.updated_at;
        if (last && (!maxSeen || Date.parse(last) > Date.parse(maxSeen))) maxSeen = last;
        if (rows.length < PAGE_SIZE || !last || last === since) break;
        since = last;
      }
      if (maxSeen) await local.setState(`cursor:${entity}`, maxSeen);
    }
  }

  async function runOnce(): Promise<SyncResult> {
    const changed = new Set<EntityName>();
    let offline = false;
    try {
      offline = (await push(changed)).offline;
      if (!offline) await pull(changed);
    } catch (error) {
      const appError = toAppError(error);
      offline = appError.code === 'network';
      if (!offline) logger.error('Sync failed', { code: appError.code, error });
    }
    if (changed.size) deps.onDataChanged?.(changed);
    return { ok: !offline, offline, pending: await local.pendingCount() };
  }

  return {
    /** Executa push + pull. Chamadas simultâneas são agrupadas (uma de cada vez). */
    sync(): Promise<SyncResult> {
      if (running) {
        rerun = true;
        return running;
      }
      running = (async () => {
        let result: SyncResult;
        do {
          rerun = false;
          result = await runOnce();
        } while (rerun && !result.offline);
        running = null;
        return result;
      })();
      return running;
    },
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
