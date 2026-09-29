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
    updated_at TEXT NOT NULL,
    -- Título + texto sem acentos e em minúsculas, para a busca local.
    search_text TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX notes_list_idx ON notes (archived, pinned, updated_at);
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

/** Remove acentos e padroniza caixa ("Café" → "cafe"). */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Palavras da busca (no máximo 8), já normalizadas. */
export function searchWords(term: string): string[] {
  return normalizeText(term)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
}

const escapeLike = (word: string) => word.replace(/[\\%_]/g, (c) => `\\${c}`);

export type ListOptions = { archived?: boolean; sort?: NoteSort; search?: string };

/**
 * Busca: todas as palavras precisam aparecer (em qualquer ordem), sem diferenciar
 * acentos ou maiúsculas. Igual em iOS, Android e web, sem depender de extensões do SQLite.
 */
export async function createNotesRepository(
  db: SqlDatabase,
  deps: { newId: () => string; now?: () => Date },
) {
  await migrate(db, MIGRATIONS);
  const now = () => (deps.now ?? (() => new Date()))().toISOString();
  const searchText = (title: string, body: string) => normalizeText(`${title}\n${body}`);

  async function get(id: string): Promise<Note | null> {
    const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', [id]);
    return row ? toNote(row) : null;
  }

  return {
    get,

    async list({ archived = false, sort = 'updated', search }: ListOptions = {}): Promise<Note[]> {
      const words = search ? searchWords(search) : [];
      if (search && words.length === 0) return [];
      const conditions = ['archived = ?', ...words.map(() => `search_text LIKE ? ESCAPE '\\'`)];
      const params = [archived ? 1 : 0, ...words.map((w) => `%${escapeLike(w)}%`)];
      const rows = await db.getAllAsync<NoteRow>(
        `SELECT * FROM notes WHERE ${conditions.join(' AND ')} ORDER BY pinned DESC, ${ORDER[sort]}`,
        params,
      );
      return rows.map(toNote);
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
        `INSERT INTO notes (id, title, body, pinned, archived, created_at, updated_at, search_text)
         VALUES (?, ?, ?, 0, 0, ?, ?, ?)`,
        [note.id, note.title, note.body, note.createdAt, note.updatedAt, searchText(note.title, note.body)],
      );
      return note;
    },

    /** Salvamento automático do editor (título e texto). */
    async update(id: string, patch: { title?: string; body?: string }): Promise<void> {
      const current = await get(id);
      if (!current) return;
      const title = patch.title ?? current.title;
      const body = patch.body ?? current.body;
      await db.runAsync(
        'UPDATE notes SET title = ?, body = ?, search_text = ?, updated_at = ? WHERE id = ?',
        [title, body, searchText(title, body), now(), id],
      );
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
      const note = await get(id);
      await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
      return note;
    },

    async restore(note: Note): Promise<void> {
      await db.runAsync(
        `INSERT OR REPLACE INTO notes (id, title, body, pinned, archived, created_at, updated_at, search_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          note.id,
          note.title,
          note.body,
          note.pinned ? 1 : 0,
          note.archived ? 1 : 0,
          note.createdAt,
          note.updatedAt,
          searchText(note.title, note.body),
        ],
      );
    },

    async count(): Promise<{ active: number; archived: number }> {
      const row = await db.getFirstAsync<{ active: number | null; archived: number | null }>(
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
