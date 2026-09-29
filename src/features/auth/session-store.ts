import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

type SessionState = {
  status: SessionStatus;
  userId: string | null;
  email: string | null;
  setSession: (session: Session | null) => void;
};

/** Estado de sessão observável. A fonte da verdade é o Supabase Auth. */
export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  userId: null,
  email: null,
  setSession: (session) =>
    set(
      session
        ? { status: 'signedIn', userId: session.user.id, email: session.user.email ?? null }
        : { status: 'signedOut', userId: null, email: null },
    ),
}));

/** ID do usuário logado; lança erro se chamado sem sessão (uso em serviços). */
export function requireUserId(): string {
  const { userId } = useSession.getState();
  if (!userId) throw new Error('No active session');
  return userId;
}
