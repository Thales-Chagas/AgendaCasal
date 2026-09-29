import { env } from '@/core/config/env';
import { logger } from '@/core/logging/logger';
import { queryClient } from '@/core/query/query-client';
import { getSupabase } from '@/core/supabase/client';

import { createAuthRepository, type AuthRepository } from './data/auth-repository';
import { useSession } from './session-store';

let repository: AuthRepository | null = null;

export function getAuthRepository(): AuthRepository {
  repository ??= createAuthRepository(getSupabase());
  return repository;
}

type SignOutListener = (userId: string) => Promise<void> | void;
const signOutListeners = new Set<SignOutListener>();

/**
 * Outras features limpam seus dados locais ao sair (agenda em cache, lembretes...).
 * As notas privadas NÃO são apagadas: ficam guardadas, por usuário, neste aparelho.
 */
export function onSignOut(listener: SignOutListener): () => void {
  signOutListeners.add(listener);
  return () => signOutListeners.delete(listener);
}

let started = false;

/** Restaura a sessão salva e acompanha mudanças (login, logout, token renovado). */
export async function startAuth(): Promise<void> {
  if (started) return;
  started = true;
  if (!env) {
    useSession.getState().setSession(null);
    return;
  }

  const supabase = getSupabase();
  supabase.auth.onAuthStateChange((event, session) => {
    const previousUserId = useSession.getState().userId;
    useSession.getState().setSession(session);
    if (event === 'SIGNED_OUT' && previousUserId) void runSignOutCleanup(previousUserId);
  });

  try {
    const session = await getAuthRepository().getSession();
    useSession.getState().setSession(session);
  } catch (error) {
    logger.warn('Session restore failed', { error });
    useSession.getState().setSession(null);
  }
}

async function runSignOutCleanup(userId: string) {
  queryClient.clear();
  for (const listener of signOutListeners) {
    try {
      await listener(userId);
    } catch (error) {
      logger.error('Sign-out cleanup failed', { error });
    }
  }
}
