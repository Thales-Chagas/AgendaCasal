import * as SQLite from 'expo-sqlite';

import type { SqlDatabase, SqlValue } from '@/core/storage/sql';

import { loadNotesDb, resetNotesVault, saveNotesDb } from './vault.web';

const SAVE_DELAY_MS = 300;

/**
 * Web: as notas abertas ficam num banco SQLite só em memória. Cada alteração grava, logo em
 * seguida, uma cópia CIFRADA no aparelho (ver vault.web.ts). Fechar o banco grava o que faltar.
 */
export async function openNotesDatabase(userId: string): Promise<SqlDatabase> {
  const saved = await loadNotesDb(userId);
  const db = saved
    ? await SQLite.deserializeDatabaseAsync(saved)
    : await SQLite.openDatabaseAsync(':memory:');

  let timer: ReturnType<typeof setTimeout> | null = null;
  let saving: Promise<void> = Promise.resolve();
  let dirty = false;

  const save = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!dirty) return saving;
    dirty = false;
    saving = saving.then(async () => saveNotesDb(userId, await db.serializeAsync()));
    return saving;
  };
  const changed = () => {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void save(), SAVE_DELAY_MS);
  };

  return {
    execAsync: async (sql) => {
      await db.execAsync(sql);
      changed();
    },
    runAsync: async (sql, params: SqlValue[] = []) => {
      const result = await db.runAsync(sql, params);
      changed();
      return result;
    },
    getAllAsync: <T>(sql: string, params: SqlValue[] = []) => db.getAllAsync<T>(sql, params),
    getFirstAsync: <T>(sql: string, params: SqlValue[] = []) => db.getFirstAsync<T>(sql, params),
    withTransactionAsync: async (task) => {
      await db.withTransactionAsync(task);
      changed();
    },
    closeAsync: async () => {
      await save();
      await db.closeAsync();
    },
  };
}

export async function deleteNotesDatabase(userId: string): Promise<void> {
  await resetNotesVault(userId);
}
