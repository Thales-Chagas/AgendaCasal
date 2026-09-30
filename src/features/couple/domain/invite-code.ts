/** Mesmo alfabeto do servidor: sem 0/O, 1/I/L e U, para evitar confusão ao digitar. */
export const INVITE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const INVITE_LENGTH = 8;

/** "abcd-2345 " → "ABCD2345" (não valida, só normaliza). */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidInviteCode(input: string): boolean {
  const code = normalizeInviteCode(input);
  return code.length === INVITE_LENGTH && [...code].every((c) => INVITE_ALPHABET.includes(c));
}

/** "ABCD2345" → "ABCD-2345" (mais fácil de ler e ditar). */
export function formatInviteCode(code: string): string {
  const normalized = normalizeInviteCode(code);
  return normalized.length > 4 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
}

export function buildInviteLink(code: string): string {
  return `duoday://convite/${normalizeInviteCode(code)}`;
}

export function buildInviteMessage(inviterName: string, code: string): string {
  return [
    `${inviterName} quer organizar a agenda com você no DuoDay ❤️`,
    '',
    `Código do convite: ${formatInviteCode(code)}`,
    `Ou toque no link: ${buildInviteLink(code)}`,
    '',
    'O convite vale por 48 horas.',
  ].join('\n');
}
