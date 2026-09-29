/**
 * Erros do app com código estável e mensagem amigável.
 * Detalhes técnicos vão apenas para o log (mascarados). O usuário nunca vê
 * "Error 500" ou "constraint violation".
 */
export type AppErrorCode =
  | 'network'
  | 'not_configured'
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'email_taken'
  | 'weak_password'
  | 'invalid_otp'
  | 'rate_limited'
  | 'session_expired'
  | 'reauthentication_needed'
  | 'invite_invalid'
  | 'own_invite'
  | 'already_paired'
  | 'couple_full'
  | 'too_many_attempts'
  | 'not_paired'
  | 'permission'
  | 'validation'
  | 'conflict'
  | 'not_found'
  | 'local_storage'
  | 'unknown';

const messages: Record<AppErrorCode, string> = {
  network: 'Sem conexão com a internet. Verifique e tente de novo.',
  not_configured: 'O aplicativo ainda não foi configurado.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail com o código que enviamos para continuar.',
  email_taken: 'Já existe uma conta com este e-mail. Que tal entrar?',
  weak_password: 'Escolha uma senha mais forte: pelo menos 8 caracteres, com letras e números.',
  invalid_otp: 'Código incorreto ou expirado. Confira o e-mail ou peça um novo código.',
  rate_limited: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
  session_expired: 'Sua sessão expirou. Entre novamente, por favor.',
  reauthentication_needed: 'Por segurança, entre novamente antes de trocar a senha.',
  invite_invalid: 'Este convite não é válido ou já expirou. Peça um novo ao seu parceiro.',
  own_invite: 'Este é o seu próprio convite. Envie-o para seu parceiro.',
  already_paired: 'Vocês já estão conectados a outra pessoa.',
  couple_full: 'Este convite já foi usado por outra pessoa.',
  too_many_attempts: 'Muitas tentativas com códigos errados. Tente de novo em uma hora.',
  not_paired: 'Você ainda não está conectado a ninguém.',
  permission: 'Você não tem permissão para fazer isso.',
  validation: 'Confira os dados e tente de novo.',
  conflict: 'Este item foi alterado em outro aparelho. Atualizamos para a versão mais recente.',
  not_found: 'Não encontramos o que você procurava. Talvez tenha sido excluído.',
  local_storage: 'Não conseguimos acessar os dados deste aparelho. Reinicie o app e tente de novo.',
  unknown: 'Algo não saiu como esperado. Tente novamente.',
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;
  override readonly cause?: unknown;

  constructor(code: AppErrorCode, options?: { cause?: unknown; userMessage?: string }) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = options?.userMessage ?? messages[code];
    this.cause = options?.cause;
  }
}

export function userMessageFor(code: AppErrorCode): string {
  return messages[code];
}

const businessCodes = new Set<AppErrorCode>([
  'own_invite',
  'already_paired',
  'couple_full',
  'too_many_attempts',
  'not_paired',
  'invite_invalid',
]);

type ErrorLike = { message?: unknown; code?: unknown; status?: unknown; name?: unknown };

/** Converte qualquer erro (Supabase, rede, validação...) em `AppError`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const e = (error ?? {}) as ErrorLike;
  const message = typeof e.message === 'string' ? e.message : '';
  const code = typeof e.code === 'string' ? e.code : '';
  const status = typeof e.status === 'number' ? e.status : undefined;

  if (businessCodes.has(message as AppErrorCode))
    return new AppError(message as AppErrorCode, { cause: error });
  if (message === 'not_authenticated') return new AppError('session_expired', { cause: error });

  // Supabase Auth (códigos estáveis)
  switch (code) {
    case 'invalid_credentials':
      return new AppError('invalid_credentials', { cause: error });
    case 'email_not_confirmed':
      return new AppError('email_not_confirmed', { cause: error });
    case 'user_already_exists':
    case 'email_exists':
      return new AppError('email_taken', { cause: error });
    case 'weak_password':
      return new AppError('weak_password', { cause: error });
    case 'otp_expired':
    case 'otp_disabled':
      return new AppError('invalid_otp', { cause: error });
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return new AppError('rate_limited', { cause: error });
    case 'reauthentication_needed':
    case 'reauthentication_not_valid':
      return new AppError('reauthentication_needed', { cause: error });
    case 'session_not_found':
    case 'refresh_token_not_found':
    case 'bad_jwt':
      return new AppError('session_expired', { cause: error });
    // PostgreSQL / PostgREST
    case '42501':
    case 'PGRST301':
      return new AppError('permission', { cause: error });
    case '23514':
    case '22P02':
    case '22001':
      return new AppError('validation', { cause: error });
    case 'PGRST116':
      return new AppError('not_found', { cause: error });
  }

  if (status === 429) return new AppError('rate_limited', { cause: error });
  if (
    e.name === 'AuthRetryableFetchError' ||
    /network request failed|failed to fetch|network error|timeout/i.test(message)
  ) {
    return new AppError('network', { cause: error });
  }

  return new AppError('unknown', { cause: error });
}
