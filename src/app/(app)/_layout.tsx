import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { logger } from '@/core/logging/logger';
import { toast, useTheme } from '@/design-system';
import { useSession } from '@/features/auth/session-store';
import { useMySpace, useSpaceRealtime } from '@/features/couple/hooks';
import { usePendingInvite } from '@/features/couple/pending-invite-store';
import {
  configureNotifications,
  registerPushToken,
  scheduleRescheduling,
} from '@/features/notifications/notification-service';
import { getAgendaRuntime, startAgendaRuntime } from '@/features/sync/agenda-runtime';

/** Área autenticada. O acesso é garantido pelo `Stack.Protected` do layout raiz. */
export default function AppLayout() {
  const { colors } = useTheme();
  const userId = useSession((s) => s.userId);
  const { data: space } = useMySpace();
  useSpaceRealtime(space?.coupleId);

  // Abre a agenda local deste usuário e mantém sincronizada.
  useEffect(() => {
    if (!userId || !space) return;
    configureNotifications();
    startAgendaRuntime(userId, space.coupleId)
      .then(() => {
        scheduleRescheduling();
        void registerPushToken();
      })
      .catch((error) => {
        logger.error('Agenda start failed', { error });
        toast.error('Não conseguimos abrir a agenda neste aparelho. Reinicie o app.');
      });
  }, [userId, space]);

  // Mudança no casal (ex.: parceiro saiu) → sincroniza de novo.
  useEffect(() => {
    getAgendaRuntime()?.requestSync();
  }, [space?.syncEpoch, space?.partner?.id]);

  // Convite recebido por link antes do login: abre o aceite logo depois de entrar.
  const pendingCode = usePendingInvite((s) => s.code);
  useEffect(() => {
    if (!pendingCode) return;
    usePendingInvite.getState().setCode(null);
    router.push({ pathname: '/couple/join', params: { code: pendingCode } });
  }, [pendingCode]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="event/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="event/edit/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="special-date/new" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="couple/connected"
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
    </Stack>
  );
}
