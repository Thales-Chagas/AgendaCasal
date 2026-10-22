import { AppState } from 'react-native';
import { create } from 'zustand';

import { usePreferences } from '@/core/preferences/preferences-store';
import { isBiometricAvailable, verifyBiometrics } from '@/features/security/biometrics';

import { closeNotes } from './notes-service';
import { lockNotesVault, notesUsePin } from './vault';

type LockState = { unlocked: boolean; setUnlocked: (value: boolean) => void };

/** Desbloqueio das notas vale até o app ir para segundo plano. */
export const useNotesLock = create<LockState>((set) => ({
  unlocked: false,
  setUnlocked: (unlocked) => set({ unlocked }),
}));

AppState.addEventListener('change', (state) => {
  if (state !== 'background') return;
  useNotesLock.getState().setUnlocked(false);
  // Web: grava o que faltar, fecha o banco e descarta a chave da memória.
  if (notesUsePin) void closeNotes().finally(lockNotesVault);
});

/** Notas trancadas agora? No web sempre pedem PIN/biometria; no celular, se a pessoa ativou. */
export function useNotesLocked(): boolean {
  const lockEnabled = usePreferences((s) => s.lockNotes);
  const unlocked = useNotesLock((s) => s.unlocked);
  return (notesUsePin || lockEnabled) && !unlocked;
}

export const canUseBiometrics = isBiometricAvailable;

/** Celular: pede Face ID / digital / senha do aparelho. */
export async function unlockNotes(userId: string): Promise<boolean> {
  const { ok } = await verifyBiometrics(userId, 'Desbloquear notas privadas');
  if (ok) useNotesLock.getState().setUnlocked(true);
  return ok;
}
