import { deleteEncryptedDatabase, openEncryptedDatabase } from '@/core/storage/encrypted-database';
import type { SqlDatabase } from '@/core/storage/sql';

const dbName = (userId: string) => `notes-${userId}`;

/** Celular: banco cifrado (SQLCipher), chave no Keychain/Keystore, só com o aparelho desbloqueado. */
export function openNotesDatabase(userId: string): Promise<SqlDatabase> {
  return openEncryptedDatabase(dbName(userId), 'foreground');
}

export function deleteNotesDatabase(userId: string): Promise<void> {
  return deleteEncryptedDatabase(dbName(userId));
}
