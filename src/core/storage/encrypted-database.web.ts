import * as SQLite from 'expo-sqlite';

import type { SqlDatabase, SqlValue } from './sql';

export type KeyAccess = 'foreground' | 'background';

/**
 * Web = apenas pré-visualização de desenvolvimento. O navegador não tem Keychain nem
 * SQLCipher; o app de produção (iOS/Android) sempre usa o banco criptografado.
 */
export async function openEncryptedDatabase(name: string, _access: KeyAccess): Promise<SqlDatabase> {
  const db = await SQLite.openDatabaseAsync(`${name}.db`);
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params: SqlValue[] = []) => db.runAsync(sql, params),
    getAllAsync: <T>(sql: string, params: SqlValue[] = []) => db.getAllAsync<T>(sql, params),
    getFirstAsync: <T>(sql: string, params: SqlValue[] = []) => db.getFirstAsync<T>(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
    closeAsync: () => db.closeAsync(),
  };
}

export async function deleteEncryptedDatabase(name: string): Promise<void> {
  await SQLite.deleteDatabaseAsync(`${name}.db`).catch(() => undefined);
}
