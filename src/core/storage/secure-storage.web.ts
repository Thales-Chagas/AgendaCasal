import type { AsyncKeyValueStorage } from './types';

/**
 * Web é apenas pré-visualização de desenvolvimento: sem Keychain disponível,
 * usamos sessionStorage (apagado ao fechar a aba).
 */
export const secureStorage: AsyncKeyValueStorage = {
  async getItem(key) {
    try {
      return globalThis.sessionStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      globalThis.sessionStorage?.setItem(key, value);
    } catch {
      // armazenamento bloqueado
    }
  },
  async removeItem(key) {
    try {
      globalThis.sessionStorage?.removeItem(key);
    } catch {
      // armazenamento bloqueado
    }
  },
};
