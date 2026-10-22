import type { AsyncKeyValueStorage } from './types';

/**
 * Web (app instalado pelo navegador): não existe Keychain, então a sessão fica no
 * armazenamento do próprio site (localStorage), isolado por domínio. Assim o login dura entre
 * aberturas, como no app. A Content-Security-Policy do build web (scripts só do próprio
 * domínio) reduz o risco de outro código ler esses valores.
 */
export const secureStorage: AsyncKeyValueStorage = {
  async getItem(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // armazenamento bloqueado (ex.: janela anônima): a sessão vale só enquanto a aba estiver aberta
    }
  },
  async removeItem(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // armazenamento bloqueado
    }
  },
};
