import { StyleSheet, View } from 'react-native';

import { Lock } from '../icons';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

/** Aviso permanente da área de notas: deixa claro que nada é compartilhado. */
export function PrivateBadge({ detailed }: { detailed?: boolean }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="Privado. Somente neste aparelho. Seu parceiro não vê suas notas."
      style={[
        styles.badge,
        {
          backgroundColor: colors.privateSoft,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.md,
        },
      ]}>
      <Lock size={18} color={colors.private} strokeWidth={2.4} />
      <View style={styles.texts}>
        <AppText variant="callout" style={{ color: colors.private }}>
          Privado · Somente neste aparelho
        </AppText>
        {detailed ? (
          <AppText variant="caption" style={{ color: colors.private }}>
            Suas notas não são enviadas para a internet e seu parceiro não tem acesso.
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center' },
  texts: { flex: 1, gap: 2 },
});
