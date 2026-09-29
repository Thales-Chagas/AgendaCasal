import { create } from 'zustand';

import { isValidInviteCode, normalizeInviteCode } from './domain/invite-code';

type PendingInviteState = {
  /** Código recebido por link antes de a pessoa entrar/criar conta. Só em memória. */
  code: string | null;
  setCode: (code: string | null) => void;
};

export const usePendingInvite = create<PendingInviteState>((set) => ({
  code: null,
  setCode: (code) => set({ code: code && isValidInviteCode(code) ? normalizeInviteCode(code) : null }),
}));
