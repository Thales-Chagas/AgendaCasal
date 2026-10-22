/**
 * No celular as notas já ficam num banco cifrado (SQLCipher) com a chave no Keychain/Keystore,
 * e o bloqueio usa a biometria do sistema. O cofre com PIN existe só no app web (vault.web.ts);
 * aqui ficam as mesmas funções, sem efeito, para o código das telas ser um só.
 */
export type PinAttempt = { ok: true } | { ok: false; waitMs: number; failures: number };

export const notesUsePin = false;

export const hasNotesPin = async (_userId: string) => true;
export const isNotesVaultUnlocked = (_userId: string) => true;
export const lockNotesVault = () => undefined;
export const createNotesPin = async (_userId: string, _pin: string) => undefined;
export const unlockNotesWithPin = async (_userId: string, _pin: string): Promise<PinAttempt> => ({
  ok: true,
});
export const notesBiometricsEnabled = async (_userId: string) => false;
export const unlockNotesWithBiometrics = async (_userId: string) => false;
export const enableNotesBiometrics = async (
  _userId: string,
): Promise<'enabled' | 'unsupported' | 'cancelled'> => 'unsupported';
export const disableNotesBiometrics = async (_userId: string) => undefined;
export const changeNotesPin = async (_userId: string, _newPin: string) => undefined;
export const resetNotesVault = async (_userId: string) => undefined;
