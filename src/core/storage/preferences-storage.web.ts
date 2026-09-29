import type { SyncKeyValueStorage } from './types';

/** Web existe só como pré-visualização de desenvolvimento. */
export const preferencesStorage: SyncKeyValueStorage = {
  getItem: (key) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Armazenamento bloqueado (ex.: janela anônima): segue só em memória.
    }
  },
  removeItem: (key) => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // idem
    }
  },
};
