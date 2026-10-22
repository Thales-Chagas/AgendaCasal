/**
 * NOTAS PRIVADAS: acesso ao banco local da pessoa logada neste aparelho.
 * Um banco criptografado por usuário: se outra pessoa entrar no mesmo celular,
 * ela não vê estas notas. Nada aqui fala com a internet.
 */
import * as Crypto from 'expo-crypto';

import { queryClient } from '@/core/query/query-client';

import { createNotesRepository, type NotesRepository } from './data/notes-repository';
import { deleteNotesDatabase, openNotesDatabase } from './notes-database';

let current: { userId: string; repository: NotesRepository } | null = null;
let opening: Promise<NotesRepository> | null = null;

export const notesKeys = { all: ['notes'] as const };

export async function openNotes(userId: string): Promise<NotesRepository> {
  if (current?.userId === userId) return current.repository;
  if (opening) return opening;
  opening = (async () => {
    if (current) await closeNotes();
    // Celular: chave só com o aparelho desbloqueado. Web: só depois do PIN ou da biometria.
    const db = await openNotesDatabase(userId);
    const repository = await createNotesRepository(db, { newId: () => Crypto.randomUUID() });
    current = { userId, repository: Object.assign(repository, { close: () => db.closeAsync() }) };
    return repository;
  })();
  try {
    return await opening;
  } finally {
    opening = null;
  }
}

export async function closeNotes(): Promise<void> {
  const repo = current?.repository as (NotesRepository & { close?: () => Promise<void> }) | undefined;
  current = null;
  await repo?.close?.().catch(() => undefined);
  queryClient.removeQueries({ queryKey: notesKeys.all });
}

/** Apaga TODAS as notas desta conta neste aparelho (usado ao excluir a conta). */
export async function destroyNotes(userId: string): Promise<void> {
  if (current?.userId === userId) await closeNotes();
  await deleteNotesDatabase(userId);
}

export function invalidateNotes() {
  void queryClient.invalidateQueries({ queryKey: notesKeys.all });
}
