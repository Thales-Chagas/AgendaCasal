import Storage from 'expo-sqlite/kv-store';

import type { SyncKeyValueStorage } from './types';

/**
 * Armazenamento síncrono para preferências NÃO sensíveis (tema, onboarding visto...).
 * Dados pessoais nunca vão aqui: use o banco criptografado.
 */
export const preferencesStorage: SyncKeyValueStorage = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
  removeItem: (key) => {
    Storage.removeItemSync(key);
  },
};
