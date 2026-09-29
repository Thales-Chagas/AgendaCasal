export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NoteSort = 'updated' | 'created' | 'title';

export const NOTE_SORT_LABELS: Record<NoteSort, string> = {
  updated: 'Editadas recentemente',
  created: 'Criadas recentemente',
  title: 'Ordem alfabética',
};

/** Título exibido: o título, ou a primeira linha do texto. */
export function displayTitle(note: Pick<Note, 'title' | 'body'>): string {
  const title = note.title.trim();
  if (title) return title;
  const firstLine = note.body.trim().split('\n')[0]?.trim();
  return firstLine || 'Nota sem título';
}

/** Prévia do texto (sem repetir a primeira linha quando ela virou título). */
export function preview(note: Pick<Note, 'title' | 'body'>, max = 120): string {
  const lines = note.body.trim().split('\n');
  const text = (note.title.trim() ? lines : lines.slice(1)).join(' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function isEmptyNote(note: Pick<Note, 'title' | 'body'>): boolean {
  return !note.title.trim() && !note.body.trim();
}
