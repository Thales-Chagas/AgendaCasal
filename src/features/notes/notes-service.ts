/**
 * NOTAS PRIVADAS: acesso ao banco local da pessoa logada neste aparelho.
 * Um banco criptografado por usuário: se outra pessoa entrar no mesmo celular,
 * ela não vê estas notas. Nada aqui fala com a internet.
 */
import * as Crypto from 'expo-crypto';

import { queryClient } from '@/core/query/query-client';
import { deleteEncryptedDatabase, openEncryptedDatabase } from '@/core/storage/encrypted-database';

import { createNotesRepository, type NotesRepository } from './data/notes-repository';

let current: { userId: string; repository: NotesRepository } | null = null;
let opening: Promise<NotesRepository> | null = null;

const dbName = (userId: string) => `notes-${userId}`;

export const notesKeys = { all: ['notes'] as const };

export async function openNotes(userId: string): Promise<NotesRepository> {
  if (current?.userId === userId) return current.repository;
  if (opening) return opening;
  opening = (async () => {
    if (current) await closeNotes();
    // Chave acessível só com o aparelho desbloqueado e só neste aparelho.
    const db = await openEncryptedDatabase(dbName(userId), 'foreground');
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
  await deleteEncryptedDatabase(dbName(userId));
}

export function invalidateNotes() {
  void queryClient.invalidateQueries({ queryKey: notesKeys.all });
}
