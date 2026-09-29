import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { AppError, toAppError } from '@/core/errors/app-error';

import { TERMS_VERSION } from '../schemas';

async function run<R extends { error: unknown }>(operation: () => Promise<R>): Promise<R> {
  let result: R;
  try {
    result = await operation();
  } catch (error) {
    throw toAppError(error);
  }
  if (result.error) throw toAppError(result.error);
  return result;
}

function requireSession(
  session: Session | null | undefined,
  code: 'invalid_otp' | 'unknown' = 'unknown',
): Session {
  if (!session) throw new AppError(code);
  return session;
}

/**
 * Acesso ao Supabase Auth. Recebe o cliente por parâmetro para poder ser testado
 * contra um Supabase local real (supabase/tests/auth-flow.test.ts).
 */
export function createAuthRepository(client: SupabaseClient) {
  return {
    async getSession(): Promise<Session | null> {
      const { data } = await run(() => client.auth.getSession());
      return data.session;
    },

    /** Cria a conta. O e-mail precisa ser confirmado com o código de 6 dígitos. */
    async signUp(input: { name: string; email: string; password: string }): Promise<void> {
      const { data } = await run(() =>
        client.auth.signUp({
          email: input.email,
          password: input.password,
          options: { data: { display_name: input.name, terms_version: TERMS_VERSION } },
        }),
      );
      // Com confirmação ativa, um e-mail já cadastrado volta sem identidades.
      if (data.user && data.user.identities?.length === 0) throw new AppError('email_taken');
    },

    async confirmSignUp(email: string, code: string): Promise<Session> {
      const { data } = await run(() => client.auth.verifyOtp({ email, token: code, type: 'email' }));
      return requireSession(data.session, 'invalid_otp');
    },

    async resendSignUpCode(email: string): Promise<void> {
      await run(() => client.auth.resend({ type: 'signup', email }));
    },

    async signIn(email: string, password: string): Promise<Session> {
      const { data } = await run(() => client.auth.signInWithPassword({ email, password }));
      return requireSession(data.session);
    },

    /** Encerra a sessão só neste aparelho. */
    async signOut(): Promise<void> {
      await run(() => client.auth.signOut({ scope: 'local' }));
    },

    /** Envia um código de recuperação. Não revela se o e-mail existe. */
    async requestPasswordReset(email: string): Promise<void> {
      await run(() => client.auth.resetPasswordForEmail(email));
    },

    async verifyRecoveryCode(email: string, code: string): Promise<Session> {
      const { data } = await run(() => client.auth.verifyOtp({ email, token: code, type: 'recovery' }));
      return requireSession(data.session, 'invalid_otp');
    },

    /** Define nova senha (após código de recuperação ou com sessão recente). */
    async setNewPassword(password: string): Promise<void> {
      await run(() => client.auth.updateUser({ password }));
    },

    /** Troca de senha a partir do perfil: confirma a senha atual antes. */
    async changePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
      try {
        await run(() => client.auth.signInWithPassword({ email, password: currentPassword }));
      } catch (error) {
        const appError = toAppError(error);
        if (appError.code === 'invalid_credentials') {
          throw new AppError('invalid_credentials', { userMessage: 'A senha atual não confere.' });
        }
        throw appError;
      }
      await run(() => client.auth.updateUser({ password: newPassword }));
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
