import { StyleSheet, View } from 'react-native';

import { useConnectivity } from '@/core/network/connectivity';
import { AppText, useTheme } from '@/design-system';
import { CloudOff } from '@/design-system/icons';

import { useAgendaStatus } from '../agenda-runtime';

/**
 * Indicador discreto: só aparece quando há algo a dizer.
 * Sem mensagens técnicas ("Será sincronizado quando houver internet").
 */
export function SyncIndicator() {
  const online = useConnectivity((s) => s.online);
  const { status, pending } = useAgendaStatus();
  const { colors, spacing, radius } = useTheme();

  const offline = !online || status === 'offline';
  if (!offline) return null;

  const message =
    pending > 0
      ? 'Sem internet · Suas alterações serão enviadas depois'
      : 'Sem internet · Mostrando a agenda salva';

  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={[
        styles.pill,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        },
      ]}>
      <CloudOff size={14} color={colors.textSecondary} />
      <AppText variant="caption" color="textSecondary">
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6 },
});
