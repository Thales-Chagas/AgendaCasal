/**
 * Interface mínima de banco SQL local. Implementada pelo expo-sqlite (app) e por
 * `node:sqlite` (testes), para que repositórios locais sejam testados de verdade.
 */
export type SqlValue = string | number | null;

export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlValue[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getAllAsync<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
}

/** Migrações sequenciais controladas por `PRAGMA user_version`. */
export async function migrate(db: SqlDatabase, migrations: readonly string[]): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < migrations.length; version++) {
    const sql = migrations[version] as string;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
