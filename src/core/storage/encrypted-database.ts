import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { AppError } from '@/core/errors/app-error';
import { logger } from '@/core/logging/logger';

import type { SqlDatabase, SqlValue } from './sql';

export type KeyAccess = 'foreground' | 'background';

/**
 * Chave de 256 bits gerada no aparelho e guardada no Keychain/Keystore
 * "somente este aparelho": não vai para backup nem para outros dispositivos.
 */
async function getOrCreateKey(name: string, access: KeyAccess): Promise<{ key: string; created: boolean }> {
  const options: SecureStore.SecureStoreOptions = {
    keychainAccessible:
      access === 'background'
        ? SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
        : SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
  const storageKey = `dbkey.${name}`;
  const existing = await SecureStore.getItemAsync(storageKey, options);
  if (existing) return { key: existing, created: false };
  const bytes = Crypto.getRandomBytes(32);
  const key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(storageKey, key, options);
  return { key, created: true };
}

function wrap(db: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params: SqlValue[] = []) => db.runAsync(sql, params),
    getAllAsync: <T>(sql: string, params: SqlValue[] = []) => db.getAllAsync<T>(sql, params),
    getFirstAsync: <T>(sql: string, params: SqlValue[] = []) => db.getFirstAsync<T>(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
    closeAsync: () => db.closeAsync(),
  };
}

/**
 * Abre (ou cria) um banco SQLite criptografado com SQLCipher.
 * Se a chave se perdeu (ex.: restauração de backup sem o Keychain), o arquivo antigo
 * é ilegível: ele é descartado e um banco novo é criado.
 */
export async function openEncryptedDatabase(name: string, access: KeyAccess): Promise<SqlDatabase> {
  const fileName = `${name}.db`;
  const { key, created } = await getOrCreateKey(name, access);

  const open = async () => {
    const db = await SQLite.openDatabaseAsync(fileName);
    // Chave bruta em hexadecimal (sem derivação lenta de senha).
    await db.execAsync(`PRAGMA key = "x'${key}'"`);
    await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    return db;
  };

  try {
    return wrap(await open());
  } catch (error) {
    logger.warn('Encrypted database unreadable, recreating', { name, created, error });
    try {
      await SQLite.deleteDatabaseAsync(fileName);
      return wrap(await open());
    } catch (retryError) {
      throw new AppError('local_storage', { cause: retryError });
    }
  }
}

/** Apaga o arquivo e a chave (os dados ficam irrecuperáveis). */
export async function deleteEncryptedDatabase(name: string): Promise<void> {
  await SQLite.deleteDatabaseAsync(`${name}.db`).catch(() => undefined);
  await SecureStore.deleteItemAsync(`dbkey.${name}`).catch(() => undefined);
}
