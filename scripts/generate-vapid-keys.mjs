#!/usr/bin/env node
/**
 * Gera o par de chaves VAPID do Web Push (uma vez por ambiente: teste e produção).
 *
 *   node scripts/generate-vapid-keys.mjs
 *
 * - A PÚBLICA vai no build web: EXPO_PUBLIC_VAPID_PUBLIC_KEY=... npm run build:web
 * - A PRIVADA vai só no servidor, como segredo das Edge Functions:
 *     npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:ajuda@duoday.com.br
 * Nunca coloque a privada no app, no git ou em mensagens.
 */
import { webcrypto } from 'node:crypto';

const b64url = (bytes) => Buffer.from(bytes).toString('base64url');

const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const publicKey = b64url(new Uint8Array(await webcrypto.subtle.exportKey('raw', pair.publicKey)));
const { d: privateKey } = await webcrypto.subtle.exportKey('jwk', pair.privateKey);

console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
