import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

type LockState = { unlocked: boolean; setUnlocked: (value: boolean) => void };

/** Desbloqueio das notas vale até o app ir para segundo plano. */
export const useNotesLock = create<LockState>((set) => ({
  unlocked: false,
  setUnlocked: (unlocked) => set({ unlocked }),
}));

AppState.addEventListener('change', (state) => {
  if (state === 'background') useNotesLock.getState().setUnlocked(false);
});

export async function canUseBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && enrolled;
}

/** Pede Face ID / digital / senha do aparelho. */
export async function unlockNotes(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloquear notas privadas',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  if (result.success) useNotesLock.getState().setUnlocked(true);
  return result.success;
}
