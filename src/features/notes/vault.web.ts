/**
 * COFRE DAS NOTAS no app web. No celular o banco das notas é cifrado pelo SQLCipher com a chave
 * no Keychain/Keystore; no navegador não existe esse cofre do sistema, então:
 *
 *  - o banco das notas fica guardado CIFRADO (AES-256-GCM) no IndexedDB deste aparelho;
 *  - a chave só existe em memória depois que a pessoa digita o PIN ou usa digital/rosto;
 *  - ao sair do app (segundo plano), a chave é descartada e as notas trancam de novo.
 *
 * Nada aqui fala com a internet: o PIN, a chave e as notas nunca saem do aparelho.
 */
import { biometricsCanUnlockKeys, enrollBiometrics, verifyBiometrics } from '@/features/security/biometrics';
import { deviceStore, requestPersistentStorage } from '@/features/security/device-store.web';
import {
  isValidPin,
  keyFromPin,
  keyFromPrf,
  newDataKey,
  open,
  openWithDataKey,
  PIN_ITERATIONS,
  pinLockoutMs,
  randomBytes,
  seal,
  sealWithDataKey,
  type Sealed,
} from '@/features/security/vault-crypto';

type Meta = {
  v: 1;
  pin: { salt: Uint8Array; iterations: number; wrapped: Sealed };
  bio?: { salt: Uint8Array; wrapped: Sealed };
  failures: number;
  lockedUntil: number;
};

export type PinAttempt = { ok: true } | { ok: false; waitMs: number; failures: number };

const metaKey = (userId: string) => `notes-meta:${userId}`;
const dbKey = (userId: string) => `notes-db:${userId}`;

let unlocked: { userId: string; dataKey: Uint8Array } | null = null;

/** No web as notas sempre pedem PIN (ou biometria) para abrir. */
export const notesUsePin = true;

const readMeta = (userId: string) => deviceStore.get<Meta>(metaKey(userId));
const writeMeta = (userId: string, meta: Meta) => deviceStore.set(metaKey(userId), meta);

export async function hasNotesPin(userId: string): Promise<boolean> {
  return !!(await readMeta(userId));
}

export function isNotesVaultUnlocked(userId: string): boolean {
  return unlocked?.userId === userId;
}

export function notesDataKey(userId: string): Uint8Array | null {
  return unlocked?.userId === userId ? unlocked.dataKey : null;
}

export function lockNotesVault(): void {
  unlocked?.dataKey.fill(0);
  unlocked = null;
}

async function wrapWithPin(pin: string, dataKey: Uint8Array): Promise<Meta['pin']> {
  const salt = randomBytes(16);
  return { salt, iterations: PIN_ITERATIONS, wrapped: await seal(await keyFromPin(pin, salt), dataKey) };
}

/** Primeiro uso neste aparelho: cria a chave das notas protegida pelo PIN. */
export async function createNotesPin(userId: string, pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error('PIN inválido');
  const dataKey = newDataKey();
  await writeMeta(userId, { v: 1, pin: await wrapWithPin(pin, dataKey), failures: 0, lockedUntil: 0 });
  requestPersistentStorage();
  unlocked = { userId, dataKey };
}

export async function unlockNotesWithPin(userId: string, pin: string): Promise<PinAttempt> {
  const meta = await readMeta(userId);
  if (!meta) return { ok: false, waitMs: 0, failures: 0 };
  const now = Date.now();
  if (meta.lockedUntil > now) return { ok: false, waitMs: meta.lockedUntil - now, failures: meta.failures };
  try {
    const dataKey = await open(await keyFromPin(pin, meta.pin.salt, meta.pin.iterations), meta.pin.wrapped);
    if (meta.failures) await writeMeta(userId, { ...meta, failures: 0, lockedUntil: 0 });
    unlocked = { userId, dataKey };
    return { ok: true };
  } catch {
    const failures = meta.failures + 1;
    const waitMs = pinLockoutMs(failures);
    await writeMeta(userId, { ...meta, failures, lockedUntil: waitMs ? now + waitMs : 0 });
    return { ok: false, waitMs, failures };
  }
}

export async function notesBiometricsEnabled(userId: string): Promise<boolean> {
  return !!(await readMeta(userId))?.bio;
}

export async function unlockNotesWithBiometrics(userId: string): Promise<boolean> {
  const meta = await readMeta(userId);
  if (!meta?.bio) return false;
  const { ok, prf } = await verifyBiometrics(userId, 'Abrir suas notas privadas');
  if (!ok || !prf) return false;
  try {
    const dataKey = await open(await keyFromPrf(prf, meta.bio.salt), meta.bio.wrapped);
    unlocked = { userId, dataKey };
    return true;
  } catch {
    return false;
  }
}

/**
 * Liga a digital/rosto para as notas (com as notas já abertas). `unsupported`: este navegador
 * não entrega o segredo da passkey (PRF), então as notas continuam só com PIN.
 */
export async function enableNotesBiometrics(
  userId: string,
): Promise<'enabled' | 'unsupported' | 'cancelled'> {
  const dataKey = notesDataKey(userId);
  const meta = await readMeta(userId);
  if (!dataKey || !meta || !biometricsCanUnlockKeys) return 'cancelled';
  let result = await verifyBiometrics(userId, 'Usar digital ou rosto nas notas');
  if (!result.ok) result = await enrollBiometrics(userId, 'Usar digital ou rosto nas notas');
  if (!result.ok) return 'cancelled';
  if (!result.prf) return 'unsupported';
  const salt = randomBytes(16);
  await writeMeta(userId, {
    ...meta,
    bio: { salt, wrapped: await seal(await keyFromPrf(result.prf, salt), dataKey) },
  });
  return 'enabled';
}

export async function disableNotesBiometrics(userId: string): Promise<void> {
  const meta = await readMeta(userId);
  if (meta?.bio) await writeMeta(userId, { ...meta, bio: undefined });
}

/** Troca o PIN (com as notas abertas). A chave das notas continua a mesma. */
export async function changeNotesPin(userId: string, newPin: string): Promise<void> {
  const dataKey = notesDataKey(userId);
  const meta = await readMeta(userId);
  if (!dataKey || !meta || !isValidPin(newPin)) throw new Error('Notas trancadas');
  await writeMeta(userId, { ...meta, pin: await wrapWithPin(newPin, dataKey), failures: 0, lockedUntil: 0 });
}

/** "Esqueci o PIN": sem o PIN não há como abrir; a única saída é apagar as notas deste aparelho. */
export async function resetNotesVault(userId: string): Promise<void> {
  if (unlocked?.userId === userId) lockNotesVault();
  await deviceStore.remove(dbKey(userId));
  await deviceStore.remove(metaKey(userId));
}

export async function loadNotesDb(userId: string): Promise<Uint8Array | null> {
  const dataKey = notesDataKey(userId);
  if (!dataKey) throw new Error('Notas trancadas');
  const sealed = await deviceStore.get<Sealed>(dbKey(userId));
  return sealed ? openWithDataKey(dataKey, sealed) : null;
}

export async function saveNotesDb(userId: string, bytes: Uint8Array): Promise<void> {
  const dataKey = notesDataKey(userId);
  if (!dataKey) throw new Error('Notas trancadas');
  await deviceStore.set(dbKey(userId), await sealWithDataKey(dataKey, bytes));
}
