import type { SqlDatabase, SqlValue } from '../sql';

type NodeStatement = {
  run: (...params: SqlValue[]) => { changes: number | bigint; lastInsertRowid: number | bigint };
  all: (...params: SqlValue[]) => unknown[];
  get: (...params: SqlValue[]) => unknown;
};
type NodeDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => NodeStatement;
  close: () => void;
};

/** Banco SQLite em memória (node:sqlite) com a mesma interface do app. Só para testes. */
export function createNodeSqlDatabase(): SqlDatabase {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => NodeDatabase };
  const db = new DatabaseSync(':memory:');
  let depth = 0;

  const toPlain = <T>(row: unknown): T => (row ? ({ ...(row as object) } as T) : (row as T));

  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params = []) {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getAllAsync<T>(sql: string, params: SqlValue[] = []) {
      return db
        .prepare(sql)
        .all(...params)
        .map((r) => toPlain<T>(r));
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[] = []) {
      const row = db.prepare(sql).get(...params);
      return row ? toPlain<T>(row) : null;
    },
    async withTransactionAsync(task) {
      const savepoint = `sp${depth++}`;
      db.exec(`SAVEPOINT ${savepoint}`);
      try {
        await task();
        db.exec(`RELEASE ${savepoint}`);
      } catch (error) {
        db.exec(`ROLLBACK TO ${savepoint}`);
        db.exec(`RELEASE ${savepoint}`);
        throw error;
      } finally {
        depth--;
      }
    },
    async closeAsync() {
      db.close();
    },
  };
}
