import { AppState } from 'react-native';
import { create } from 'zustand';

import { usePreferences } from '@/core/preferences/preferences-store';
import { useSession } from '@/features/auth/session-store';

/** Fora do app por mais que isso → pede a biometria de novo ao voltar. */
export const APP_LOCK_GRACE_MS = 30_000;

type AppLockState = { locked: boolean; unlock: () => void; lock: () => void };

/**
 * Bloqueio do app com digital ou rosto (opcional, por aparelho). Começa trancado ao abrir o app
 * e tranca de novo depois de um tempo em segundo plano.
 */
export const useAppLock = create<AppLockState>((set) => ({
  locked: usePreferences.getState().appLock,
  unlock: () => set({ locked: false }),
  lock: () => set({ locked: true }),
}));

let hiddenAt: number | null = null;

AppState.addEventListener('change', (state) => {
  if (state === 'background') {
    hiddenAt = Date.now();
    return;
  }
  if (state === 'active' && hiddenAt !== null) {
    const away = Date.now() - hiddenAt;
    hiddenAt = null;
    if (usePreferences.getState().appLock && away > APP_LOCK_GRACE_MS) useAppLock.getState().lock();
  }
});

// Quem acabou de entrar com e-mail e senha já provou quem é: não pede a biometria de novo.
useSession.subscribe((state, previous) => {
  if (previous.status === 'signedOut' && state.status === 'signedIn') useAppLock.getState().unlock();
});
