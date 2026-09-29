import * as SecureStore from 'expo-secure-store';

import type { AsyncKeyValueStorage } from './types';

/**
 * Keychain (iOS) / Keystore (Android), só neste aparelho: não vai para backup
 * nem para outros dispositivos.
 */
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// O Android recomenda valores pequenos no SecureStore: dividimos em partes.
const CHUNK_SIZE = 1800;

const chunkCountKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function removeChunks(key: string) {
  const count = Number((await SecureStore.getItemAsync(chunkCountKey(key), options)) ?? 0);
  await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i), options)),
  );
  await SecureStore.deleteItemAsync(chunkCountKey(key), options);
}

/** Armazenamento seguro para valores sensíveis de qualquer tamanho (ex.: sessão). */
export const secureStorage: AsyncKeyValueStorage = {
  async getItem(key) {
    const countRaw = await SecureStore.getItemAsync(chunkCountKey(key), options);
    if (countRaw === null) return null;
    const count = Number(countRaw);
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i), options)),
    );
    if (parts.some((p) => p === null)) return null;
    return parts.join('');
  },
  async setItem(key, value) {
    await removeChunks(key);
    const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk, options)));
    await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length), options);
  },
  async removeItem(key) {
    await removeChunks(key);
  },
};
