import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Digital ou rosto no celular (Face ID, Touch ID, biometria do Android), com a senha do
 * aparelho como alternativa. Quem guarda e compara a biometria é o sistema: o app só recebe
 * "deu certo" ou "não deu".
 */
export type BiometricResult = { ok: boolean; prf: Uint8Array | null };

export async function isBiometricAvailable(): Promise<boolean> {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && enrolled;
}

/** No celular não há cadastro próprio: vale a biometria do sistema. */
export async function isBiometricEnrolled(_userId: string): Promise<boolean> {
  return isBiometricAvailable();
}

export async function verifyBiometrics(_userId: string, reason: string): Promise<BiometricResult> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return { ok: result.success, prf: null };
}

export async function enrollBiometrics(userId: string, reason: string): Promise<BiometricResult> {
  return verifyBiometrics(userId, reason);
}

export async function forgetBiometrics(_userId: string): Promise<void> {
  // nada guardado no app
}

/** No celular a biometria abre as notas direto (o banco já é protegido pelo Keychain/Keystore). */
export const biometricsCanUnlockKeys = false;
