import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useTheme } from '@/design-system';
import { useMySpace, useSpaceRealtime } from '@/features/couple/hooks';
import { usePendingInvite } from '@/features/couple/pending-invite-store';

/** Área autenticada. O acesso é garantido pelo `Stack.Protected` do layout raiz. */
export default function AppLayout() {
  const { colors } = useTheme();
  const { data: space } = useMySpace();
  useSpaceRealtime(space?.coupleId);

  // Convite recebido por link antes do login: abre o aceite logo depois de entrar.
  const pendingCode = usePendingInvite((s) => s.code);
  useEffect(() => {
    if (!pendingCode) return;
    usePendingInvite.getState().setCode(null);
    router.push({ pathname: '/couple/join', params: { code: pendingCode } });
  }, [pendingCode]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="event/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="note/[id]" />
      <Stack.Screen
        name="couple/connected"
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
    </Stack>
  );
}
