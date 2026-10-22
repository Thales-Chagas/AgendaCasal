/**
 * Digital ou rosto no app web (iPhone pelo Safari, Android pelo Chrome): uma passkey do
 * próprio aparelho (WebAuthn), com verificação do usuário obrigatória. O navegador e o sistema
 * fazem a leitura da biometria; o site nunca a recebe.
 *
 * Além de confirmar que é a pessoa, a extensão PRF da passkey devolve um segredo fixo daquela
 * passkey, que só sai depois da biometria. Ele embrulha a chave das notas (ver vault-crypto), então
 * a biometria realmente abre o cofre, não é só uma "tela na frente". Sem PRF (navegadores antigos),
 * a biometria serve para destravar o app, e as notas pedem o PIN.
 */
import { deviceStore } from './device-store.web';
import { randomBytes } from './vault-crypto';

export type BiometricResult = { ok: boolean; prf: Uint8Array | null };

type Enrollment = { credentialId: string; prf: boolean };

const enrollmentKey = (userId: string) => `bio:${userId}`;
// Entrada fixa da PRF: a saída muda por passkey, então não precisa ser secreta.
const PRF_INPUT = new TextEncoder().encode('duoday-notes-prf-v1');

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const buf = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer as ArrayBuffer;

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };

function prfFrom(credential: PublicKeyCredential): Uint8Array | null {
  const first = (credential.getClientExtensionResults() as PrfResults).prf?.results?.first;
  return first ? new Uint8Array(first) : null;
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    return (
      typeof PublicKeyCredential !== 'undefined' &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

export async function isBiometricEnrolled(userId: string): Promise<boolean> {
  return !!(await deviceStore.get<Enrollment>(enrollmentKey(userId)).catch(() => undefined));
}

async function assert(credentialId: string): Promise<PublicKeyCredential | null> {
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: buf(randomBytes(32)),
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: buf(fromB64(credentialId)) }],
      userVerification: 'required',
      timeout: 60_000,
      extensions: { prf: { eval: { first: buf(PRF_INPUT) } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  return credential;
}

/** Cria a passkey deste aparelho (pede a biometria) e já devolve a saída PRF, se houver. */
export async function enrollBiometrics(userId: string, _reason: string): Promise<BiometricResult> {
  try {
    const created = (await navigator.credentials.create({
      publicKey: {
        rp: { name: 'DuoDay', id: location.hostname },
        user: {
          id: buf(randomBytes(16)),
          name: 'DuoDay neste aparelho',
          displayName: 'DuoDay neste aparelho',
        },
        challenge: buf(randomBytes(32)),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        attestation: 'none',
        timeout: 60_000,
        extensions: { prf: { eval: { first: buf(PRF_INPUT) } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
    if (!created) return { ok: false, prf: null };

    const credentialId = toB64(new Uint8Array(created.rawId));
    let prf = prfFrom(created);
    const prfEnabled = !!(created.getClientExtensionResults() as PrfResults).prf?.enabled || !!prf;
    // Alguns navegadores só entregam a saída PRF no primeiro uso, não na criação.
    if (!prf && prfEnabled) {
      const used = await assert(credentialId).catch(() => null);
      prf = used ? prfFrom(used) : null;
    }
    await deviceStore.set(enrollmentKey(userId), { credentialId, prf: !!prf } satisfies Enrollment);
    return { ok: true, prf };
  } catch {
    return { ok: false, prf: null };
  }
}

export async function verifyBiometrics(userId: string, _reason: string): Promise<BiometricResult> {
  const enrollment = await deviceStore.get<Enrollment>(enrollmentKey(userId)).catch(() => undefined);
  if (!enrollment) return { ok: false, prf: null };
  try {
    const credential = await assert(enrollment.credentialId);
    return credential ? { ok: true, prf: prfFrom(credential) } : { ok: false, prf: null };
  } catch {
    return { ok: false, prf: null };
  }
}

/** Esquece a passkey neste aparelho (a pessoa pode apagá-la também no gerenciador de senhas). */
export async function forgetBiometrics(userId: string): Promise<void> {
  await deviceStore.remove(enrollmentKey(userId)).catch(() => undefined);
}

/** No web a biometria pode abrir a chave das notas (PRF). */
export const biometricsCanUnlockKeys = true;
