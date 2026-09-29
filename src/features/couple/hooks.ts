import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { logger } from '@/core/logging/logger';
import { secureStorage } from '@/core/storage/secure-storage';
import { getSupabase } from '@/core/supabase/client';
import { useSession } from '@/features/auth/session-store';

import {
  createCoupleRepository,
  type ActiveInvite,
  type AvatarColorKey,
  type CoupleRepository,
} from './data/couple-repository';

let repository: CoupleRepository | null = null;
export function getCoupleRepository(): CoupleRepository {
  repository ??= createCoupleRepository(getSupabase());
  return repository;
}

export const spaceKeys = {
  space: (userId: string | null) => ['space', userId] as const,
  invite: (coupleId: string | undefined) => ['invite', coupleId] as const,
};

/** Meu espaço (casal): eu, parceiro (se houver) e metadados de sincronização. */
export function useMySpace() {
  const userId = useSession((s) => s.userId);
  return useQuery({
    queryKey: spaceKeys.space(userId),
    queryFn: () => getCoupleRepository().getMySpace(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

/**
 * Escuta, em tempo real, mudanças no vínculo (ex.: o parceiro aceitou o convite).
 * O servidor só envia eventos que a RLS permite a este usuário ver.
 */
export function useSpaceRealtime(coupleId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.userId);
  useEffect(() => {
    if (!coupleId) return;
    const channel = getSupabase()
      .channel(`space:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_members', filter: `couple_id=eq.${coupleId}` },
        () => queryClient.invalidateQueries({ queryKey: spaceKeys.space(userId) }),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
        () => queryClient.invalidateQueries({ queryKey: spaceKeys.space(userId) }),
      )
      .subscribe();
    return () => {
      void getSupabase().removeChannel(channel);
    };
  }, [coupleId, queryClient, userId]);
}

const inviteStorageKey = (coupleId: string) => `invite.${coupleId}`;

/**
 * Convite ativo. O código só existe em claro neste aparelho (o servidor guarda o hash),
 * então ele fica no armazenamento seguro até expirar.
 */
export function useActiveInvite(coupleId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: spaceKeys.invite(coupleId),
    enabled: !!coupleId && enabled,
    staleTime: Infinity,
    queryFn: async (): Promise<ActiveInvite> => {
      const key = inviteStorageKey(coupleId as string);
      const cached = await secureStorage.getItem(key).catch(() => null);
      if (cached) {
        try {
          const invite = JSON.parse(cached) as ActiveInvite;
          if (new Date(invite.expiresAt).getTime() - Date.now() > 60 * 60_000) return invite;
        } catch {
          logger.warn('Discarding malformed cached invite');
        }
      }
      const invite = await getCoupleRepository().createInvite();
      await secureStorage.setItem(key, JSON.stringify(invite)).catch(() => undefined);
      return invite;
    },
  });
}

export function useRenewInvite(coupleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const invite = await getCoupleRepository().createInvite();
      if (coupleId)
        await secureStorage
          .setItem(inviteStorageKey(coupleId), JSON.stringify(invite))
          .catch(() => undefined);
      return invite;
    },
    onSuccess: (invite) => queryClient.setQueryData(spaceKeys.invite(coupleId), invite),
  });
}

export function usePreviewInvite(code: string | null) {
  return useQuery({
    queryKey: ['invite-preview', code],
    enabled: !!code,
    retry: false,
    queryFn: () => getCoupleRepository().previewInvite(code as string),
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, bringMyEvents }: { code: string; bringMyEvents: boolean }) =>
      getCoupleRepository().acceptInvite(code, bringMyEvents),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['space'] }),
  });
}

export function useLeaveCouple() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keepSharedCopy: boolean) => getCoupleRepository().leaveCouple(keepSharedCopy),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['space'] }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.userId);
  return useMutation({
    mutationFn: (input: { displayName?: string; avatarColor?: AvatarColorKey }) =>
      getCoupleRepository().updateMyProfile(userId as string, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spaceKeys.space(userId) }),
  });
}

/** Quem sou eu e quem é o parceiro (para rótulos "Meu / De Ana / Nosso"). */
export function usePeople() {
  const userId = useSession((s) => s.userId);
  const { data: space } = useMySpace();
  return {
    viewerId: userId ?? '',
    me: space?.me ?? null,
    partner: space?.partner ?? null,
    partnerId: space?.partner?.id ?? null,
    partnerName: space?.partner?.displayName ?? null,
    space: space ?? null,
  };
}
