/**
 * NOTAS PRIVADAS: camada 100% local.
 *
 * Este módulo NUNCA importa o cliente do servidor (regra de lint + teste automatizado).
 * O conteúdo das notas não sai do aparelho.
 */
import { migrate, type SqlDatabase } from '@/core/storage/sql';

import type { Note, NoteSort } from '../domain/types';

const MIGRATIONS = [
  `
  CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    pinned INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX notes_list_idx ON notes (archived, pinned, updated_at);

  CREATE VIRTUAL TABLE notes_fts USING fts5(
    title, body, content='notes', content_rowid='rowid', tokenize='unicode61 remove_diacritics 2'
  );
  CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts (rowid, title, body) VALUES (new.rowid, new.title, new.body);
  END;
  CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts (notes_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
  END;
  CREATE TRIGGER notes_au AFTER UPDATE OF title, body ON notes BEGIN
    INSERT INTO notes_fts (notes_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
    INSERT INTO notes_fts (rowid, title, body) VALUES (new.rowid, new.title, new.body);
  END;
  `,
];

type NoteRow = {
  id: string;
  title: string;
  body: string;
  pinned: number;
  archived: number;
  created_at: string;
  updated_at: string;
};

const toNote = (r: NoteRow): Note => ({
  id: r.id,
  title: r.title,
  body: r.body,
  pinned: r.pinned === 1,
  archived: r.archived === 1,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const ORDER: Record<NoteSort, string> = {
  updated: 'updated_at DESC',
  created: 'created_at DESC',
  title: `CASE WHEN title = '' THEN body ELSE title END COLLATE NOCASE ASC`,
};

/** "cafe ana" → `"cafe"* "ana"*` (todas as palavras, por prefixo, sem acento). */
export function toFtsQuery(term: string): string | null {
  const words = term
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
  if (words.length === 0) return null;
  return words.map((w) => `"${w.replace(/"/g, '')}"*`).join(' ');
}

export type ListOptions = { archived?: boolean; sort?: NoteSort; search?: string };

export async function createNotesRepository(
  db: SqlDatabase,
  deps: { newId: () => string; now?: () => Date },
) {
  await migrate(db, MIGRATIONS);
  const now = () => (deps.now ?? (() => new Date()))().toISOString();

  return {
    async list({ archived = false, sort = 'updated', search }: ListOptions = {}): Promise<Note[]> {
      const fts = search ? toFtsQuery(search) : null;
      if (search && !fts) return [];
      const rows = fts
        ? await db.getAllAsync<NoteRow>(
            `SELECT n.* FROM notes n JOIN notes_fts f ON f.rowid = n.rowid
              WHERE notes_fts MATCH ? AND n.archived = ?
              ORDER BY n.pinned DESC, ${ORDER[sort].replace(/(^|, )(\w)/g, '$1n.$2')}`,
            [fts, archived ? 1 : 0],
          )
        : await db.getAllAsync<NoteRow>(
            `SELECT * FROM notes WHERE archived = ? ORDER BY pinned DESC, ${ORDER[sort]}`,
            [archived ? 1 : 0],
          );
      return rows.map(toNote);
    },

    async get(id: string): Promise<Note | null> {
      const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', [id]);
      return row ? toNote(row) : null;
    },

    async create(input: { title?: string; body?: string } = {}): Promise<Note> {
      const timestamp = now();
      const note: Note = {
        id: deps.newId(),
        title: input.title ?? '',
        body: input.body ?? '',
        pinned: false,
        archived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await db.runAsync(
        'INSERT INTO notes (id, title, body, pinned, archived, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?)',
        [note.id, note.title, note.body, note.createdAt, note.updatedAt],
      );
      return note;
    },

    /** Salvamento automático do editor (título e texto). */
    async update(id: string, patch: { title?: string; body?: string }): Promise<void> {
      const current = await this.get(id);
      if (!current) return;
      await db.runAsync('UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?', [
        patch.title ?? current.title,
        patch.body ?? current.body,
        now(),
        id,
      ]);
    },

    async setPinned(id: string, pinned: boolean): Promise<void> {
      await db.runAsync('UPDATE notes SET pinned = ? WHERE id = ?', [pinned ? 1 : 0, id]);
    },

    async setArchived(id: string, archived: boolean): Promise<void> {
      await db.runAsync(
        'UPDATE notes SET archived = ?, pinned = CASE WHEN ? = 1 THEN 0 ELSE pinned END WHERE id = ?',
        [archived ? 1 : 0, archived ? 1 : 0, id],
      );
    },

    /** Exclui e devolve a nota (para "Desfazer"). */
    async remove(id: string): Promise<Note | null> {
      const note = await this.get(id);
      await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
      return note;
    },

    async restore(note: Note): Promise<void> {
      await db.runAsync(
        'INSERT OR REPLACE INTO notes (id, title, body, pinned, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          note.id,
          note.title,
          note.body,
          note.pinned ? 1 : 0,
          note.archived ? 1 : 0,
          note.createdAt,
          note.updatedAt,
        ],
      );
    },

    async count(): Promise<{ active: number; archived: number }> {
      const row = await db.getFirstAsync<{ active: number; archived: number }>(
        'SELECT sum(archived = 0) AS active, sum(archived = 1) AS archived FROM notes',
      );
      return { active: row?.active ?? 0, archived: row?.archived ?? 0 };
    },

    /** Exportação (backup manual feito pela própria pessoa). */
    async exportAll(): Promise<Note[]> {
      const rows = await db.getAllAsync<NoteRow>('SELECT * FROM notes ORDER BY created_at');
      return rows.map(toNote);
    },
  };
}

export type NotesRepository = Awaited<ReturnType<typeof createNotesRepository>>;
