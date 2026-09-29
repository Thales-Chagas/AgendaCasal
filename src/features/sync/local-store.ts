import { migrate, type SqlDatabase, type SqlValue } from '@/core/storage/sql';
import { toDateKey } from '@/features/events/domain/dates';
import type { CalendarEvent } from '@/features/events/domain/types';
import type { SpecialDate } from '@/features/special-dates/domain/types';

import { entityConfigs, normalizeSearch, type EntityName, type SyncedEntity } from './entities';

/**
 * Cópia local (criptografada) da agenda do casal + fila de envio (outbox).
 * As telas leem daqui: abrem na hora e funcionam sem internet.
 */
const MIGRATIONS = [
  `
  CREATE TABLE events (
    id TEXT PRIMARY KEY NOT NULL,
    couple_id TEXT NOT NULL,
    data TEXT NOT NULL,
    version INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    all_day INTEGER NOT NULL,
    starts_ms INTEGER,
    ends_ms INTEGER,
    start_date TEXT,
    end_date TEXT,
    recurring INTEGER NOT NULL,
    search TEXT NOT NULL
  );
  CREATE INDEX events_timed_idx ON events (deleted, recurring, starts_ms);
  CREATE INDEX events_dates_idx ON events (deleted, recurring, start_date);

  CREATE TABLE special_dates (
    id TEXT PRIMARY KEY NOT NULL,
    couple_id TEXT NOT NULL,
    data TEXT NOT NULL,
    version INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    date TEXT NOT NULL,
    search TEXT NOT NULL
  );

  CREATE TABLE outbox (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    op TEXT NOT NULL CHECK (op IN ('create', 'update', 'delete')),
    patch TEXT NOT NULL,
    base TEXT,
    created_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX outbox_entity_idx ON outbox (entity, entity_id);

  CREATE TABLE sync_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  `,
];

export type OutboxOp = 'create' | 'update' | 'delete';

export type OutboxItem = {
  seq: number;
  entity: EntityName;
  entityId: string;
  op: OutboxOp;
  /** create: entidade completa; update: só os campos alterados. */
  patch: Record<string, unknown>;
  /** Estado confirmado pelo servidor quando a edição começou (base do merge). */
  base: SyncedEntity | null;
  attempts: number;
};

type OutboxRow = {
  seq: number;
  entity: EntityName;
  entity_id: string;
  op: OutboxOp;
  patch: string;
  base: string | null;
  attempts: number;
};

export type EntityMap = { events: CalendarEvent; special_dates: SpecialDate };

export async function createLocalStore(db: SqlDatabase) {
  await migrate(db, MIGRATIONS);

  const parse = <T>(row: { data: string } | null): T | null => (row ? (JSON.parse(row.data) as T) : null);

  async function write<E extends EntityName>(entity: E, value: EntityMap[E]): Promise<void> {
    const config = entityConfigs[entity];
    const extra = config.localColumns(value as never);
    const columns = ['id', 'couple_id', 'data', 'version', 'deleted', 'updated_at', ...Object.keys(extra)];
    const values: SqlValue[] = [
      value.id,
      value.coupleId,
      JSON.stringify(value),
      value.version,
      value.deletedAt ? 1 : 0,
      value.updatedAt,
      ...Object.values(extra),
    ];
    await db.runAsync(
      `INSERT OR REPLACE INTO ${entity} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values,
    );
  }

  const store = {
    db,

    get: async <E extends EntityName>(entity: E, id: string) =>
      parse<EntityMap[E]>(
        await db.getFirstAsync<{ data: string }>(`SELECT data FROM ${entity} WHERE id = ?`, [id]),
      ),

    put: write,

    remove: async (entity: EntityName, id: string) => {
      await db.runAsync(`DELETE FROM ${entity} WHERE id = ?`, [id]);
    },

    /** Compromissos que podem ter ocorrências no intervalo (os recorrentes sempre entram). */
    async eventsForRange(from: Date, to: Date): Promise<CalendarEvent[]> {
      const fromKey = toDateKey(from);
      const toKey = toDateKey(to);
      const rows = await db.getAllAsync<{ data: string }>(
        `SELECT data FROM events
          WHERE deleted = 0 AND (
            recurring = 1
            OR (all_day = 0 AND starts_ms < ? AND ends_ms >= ?)
            OR (all_day = 1 AND start_date <= ? AND end_date >= date(?, '-1 day'))
          )`,
        [to.getTime(), from.getTime(), toKey, fromKey],
      );
      return rows.map((r) => JSON.parse(r.data) as CalendarEvent);
    },

    async allActive<E extends EntityName>(entity: E): Promise<EntityMap[E][]> {
      const rows = await db.getAllAsync<{ data: string }>(`SELECT data FROM ${entity} WHERE deleted = 0`);
      return rows.map((r) => JSON.parse(r.data) as EntityMap[E]);
    },

    /** Busca local sem acento/maiúsculas (título, descrição, lugar, categoria). */
    async search<E extends EntityName>(entity: E, term: string, limit = 50): Promise<EntityMap[E][]> {
      const words = normalizeSearch(term).split(/\s+/).filter(Boolean);
      if (words.length === 0) return [];
      const where = words.map(() => `search LIKE ? ESCAPE '\\'`).join(' AND ');
      const params = words.map((w) => `%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
      const rows = await db.getAllAsync<{ data: string }>(
        `SELECT data FROM ${entity} WHERE deleted = 0 AND ${where} LIMIT ${Math.floor(limit)}`,
        params,
      );
      return rows.map((r) => JSON.parse(r.data) as EntityMap[E]);
    },

    async clearData(): Promise<void> {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM events');
        await db.runAsync('DELETE FROM special_dates');
        await db.runAsync(`DELETE FROM sync_state WHERE key LIKE 'cursor:%'`);
      });
    },

    // ---------------------------------------------------------------- estado
    async getState(key: string): Promise<string | null> {
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', [
        key,
      ]);
      return row?.value ?? null;
    },
    async setState(key: string, value: string): Promise<void> {
      await db.runAsync('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)', [key, value]);
    },

    // ---------------------------------------------------------------- outbox
    async outbox(): Promise<OutboxItem[]> {
      const rows = await db.getAllAsync<OutboxRow>('SELECT * FROM outbox ORDER BY seq');
      return rows.map((r) => ({
        seq: r.seq,
        entity: r.entity,
        entityId: r.entity_id,
        op: r.op,
        patch: JSON.parse(r.patch) as Record<string, unknown>,
        base: r.base ? (JSON.parse(r.base) as SyncedEntity) : null,
        attempts: r.attempts,
      }));
    },

    async pendingCount(): Promise<number> {
      const row = await db.getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM outbox');
      return row?.n ?? 0;
    },

    async hasPending(entity: EntityName, id: string): Promise<boolean> {
      const row = await db.getFirstAsync<{ n: number }>(
        'SELECT count(*) AS n FROM outbox WHERE entity = ? AND entity_id = ?',
        [entity, id],
      );
      return (row?.n ?? 0) > 0;
    },

    /**
     * Enfileira uma alteração, combinando com o que já estava pendente para o mesmo item:
     *  - create + update → create com os dados novos;
     *  - update + update → um update com os campos somados (mantém a base original);
     *  - create + delete → nada a enviar;
     *  - * + delete → delete.
     */
    async enqueue(
      entity: EntityName,
      entityId: string,
      op: OutboxOp,
      patch: Record<string, unknown>,
      base: SyncedEntity | null,
    ): Promise<void> {
      await db.withTransactionAsync(async () => {
        const existing = await db.getAllAsync<OutboxRow>(
          'SELECT * FROM outbox WHERE entity = ? AND entity_id = ? ORDER BY seq',
          [entity, entityId],
        );
        const pendingCreate = existing.find((r) => r.op === 'create');
        const pendingUpdate = existing.find((r) => r.op === 'update');
        const now = new Date().toISOString();

        if (op === 'delete') {
          await db.runAsync('DELETE FROM outbox WHERE entity = ? AND entity_id = ?', [entity, entityId]);
          if (!pendingCreate) {
            await db.runAsync(
              'INSERT INTO outbox (entity, entity_id, op, patch, base, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [entity, entityId, 'delete', '{}', base ? JSON.stringify(base) : null, now],
            );
          }
          return;
        }

        if (op === 'update' && pendingCreate) {
          const merged = { ...(JSON.parse(pendingCreate.patch) as object), ...patch };
          await db.runAsync('UPDATE outbox SET patch = ? WHERE seq = ?', [
            JSON.stringify(merged),
            pendingCreate.seq,
          ]);
          return;
        }

        if (op === 'update' && pendingUpdate) {
          const merged = { ...(JSON.parse(pendingUpdate.patch) as object), ...patch };
          await db.runAsync('UPDATE outbox SET patch = ? WHERE seq = ?', [
            JSON.stringify(merged),
            pendingUpdate.seq,
          ]);
          return;
        }

        await db.runAsync(
          'INSERT INTO outbox (entity, entity_id, op, patch, base, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [entity, entityId, op, JSON.stringify(patch), base ? JSON.stringify(base) : null, now],
        );
      });
    },

    /** Desfaz uma exclusão ainda não enviada. Retorna false se ela já foi enviada. */
    async cancelPendingDelete(entity: EntityName, entityId: string): Promise<boolean> {
      const result = await db.runAsync(
        `DELETE FROM outbox WHERE entity = ? AND entity_id = ? AND op = 'delete'`,
        [entity, entityId],
      );
      return result.changes > 0;
    },

    async ack(seq: number): Promise<void> {
      await db.runAsync('DELETE FROM outbox WHERE seq = ?', [seq]);
    },

    /**
     * Confirma um envio. Se o item recebeu novas edições enquanto era enviado, ele não é
     * removido: vira um "update" com a nova base do servidor (nada se perde).
     * Retorna true quando a confirmação foi completa.
     */
    async ackIfUnchanged(item: OutboxItem, serverState: SyncedEntity): Promise<boolean> {
      const result = await db.runAsync('DELETE FROM outbox WHERE seq = ? AND patch = ?', [
        item.seq,
        JSON.stringify(item.patch),
      ]);
      if (result.changes > 0) return true;
      await db.runAsync(`UPDATE outbox SET op = 'update', base = ? WHERE seq = ? AND op != 'delete'`, [
        JSON.stringify(serverState),
        item.seq,
      ]);
      return false;
    },

    async markAttempt(seq: number): Promise<void> {
      await db.runAsync('UPDATE outbox SET attempts = attempts + 1 WHERE seq = ?', [seq]);
    },

    async setCreatePayload(seq: number, patch: Record<string, unknown>): Promise<void> {
      await db.runAsync('UPDATE outbox SET patch = ? WHERE seq = ?', [JSON.stringify(patch), seq]);
    },
  };

  return store;
}

export type LocalStore = Awaited<ReturnType<typeof createLocalStore>>;
