/**
 * Criptografia do "cofre" das notas no app web (WebCrypto, sem bibliotecas externas).
 *
 *  - Uma chave de dados (AES-256-GCM) aleatória cifra o banco das notas.
 *  - Essa chave nunca é guardada pura: fica "embrulhada" (cifrada) por uma chave derivada do PIN
 *    (PBKDF2-SHA-256 com sal aleatório) e, se a pessoa ativar, por outra derivada da biometria
 *    (saída PRF da passkey do aparelho, via HKDF).
 *  - Cada cifragem usa um IV novo; o GCM detecta qualquer alteração ou PIN errado.
 */

export type Sealed = { iv: Uint8Array; data: Uint8Array };

/** Iterações do PBKDF2 (recomendação OWASP 2023 para SHA-256). */
export const PIN_ITERATIONS = 600_000;
const DATA_KEY_BYTES = 32;

const subtle = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('WebCrypto indisponível');
  return s;
};

const encoder = new TextEncoder();

// O TypeScript 5.7+ distingue Uint8Array<ArrayBufferLike> de BufferSource; copiar resolve.
const buf = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer as ArrayBuffer;

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/** Chave de dados nova (bytes crus, só em memória). */
export function newDataKey(): Uint8Array {
  return randomBytes(DATA_KEY_BYTES);
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return subtle().importKey('raw', buf(raw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Chave para embrulhar a chave de dados, a partir do PIN. */
export async function keyFromPin(
  pin: string,
  salt: Uint8Array,
  iterations = PIN_ITERATIONS,
): Promise<CryptoKey> {
  const material = await subtle().importKey('raw', buf(encoder.encode(pin)), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: buf(salt), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Chave para embrulhar a chave de dados, a partir da saída PRF da biometria (passkey). */
export async function keyFromPrf(prfOutput: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  const material = await subtle().importKey('raw', buf(prfOutput), 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: buf(salt), info: buf(encoder.encode('duoday-notes-v1')) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function seal(key: CryptoKey, plain: Uint8Array): Promise<Sealed> {
  const iv = randomBytes(12);
  const data = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: buf(iv) }, key, buf(plain)));
  return { iv, data };
}

/** Lança erro se a chave estiver errada ou o conteúdo tiver sido alterado. */
export async function open(key: CryptoKey, sealed: Sealed): Promise<Uint8Array> {
  return new Uint8Array(
    await subtle().decrypt({ name: 'AES-GCM', iv: buf(sealed.iv) }, key, buf(sealed.data)),
  );
}

/** Cifra/decifra o conteúdo (o banco das notas) com a chave de dados. */
export async function sealWithDataKey(dataKey: Uint8Array, plain: Uint8Array): Promise<Sealed> {
  return seal(await importAesKey(dataKey), plain);
}

export async function openWithDataKey(dataKey: Uint8Array, sealed: Sealed): Promise<Uint8Array> {
  return open(await importAesKey(dataKey), sealed);
}

/** PIN numérico de 6 dígitos (o mesmo tamanho do código do e-mail). */
export const PIN_LENGTH = 6;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** PINs óbvios demais (repetidos ou em sequência) não são aceitos. */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - (digits[i] as number));
  return steps.every((s) => s === 1) || steps.every((s) => s === -1);
}

/** Espera depois de erros seguidos de PIN: 5 erros → 30 s, e dobra a cada novo erro. */
export function pinLockoutMs(failures: number): number {
  if (failures < 5) return 0;
  return Math.min(30_000 * 2 ** (failures - 5), 60 * 60_000);
}
