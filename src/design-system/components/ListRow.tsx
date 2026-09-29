import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ChevronRight, type Icon } from '../icons';
import type { ColorTokens } from '../tokens/colors';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: Icon;
  iconTone?: keyof Pick<ColorTokens, 'primary' | 'private' | 'info' | 'danger' | 'success' | 'textSecondary'>;
  value?: string;
  onPress?: () => void;
  /** Transforma a linha em um interruptor. */
  toggle?: { value: boolean; onChange: (value: boolean) => void };
  destructive?: boolean;
  right?: ReactNode;
  testID?: string;
};

/** Linha de lista / configuração, com alvo de toque confortável. */
export function ListRow({
  title,
  subtitle,
  icon: IconComponent,
  iconTone = 'textSecondary',
  value,
  onPress,
  toggle,
  destructive,
  right,
  testID,
}: ListRowProps) {
  const { colors, spacing, radius } = useTheme();
  const titleColor = destructive ? 'danger' : 'textPrimary';

  const content = (
    <View style={[styles.row, { paddingVertical: spacing.md, gap: spacing.md }]}>
      {IconComponent ? (
        <View style={[styles.icon, { backgroundColor: colors.surfaceMuted, borderRadius: radius.md }]}>
          <IconComponent size={20} color={destructive ? colors.danger : colors[iconTone]} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <AppText variant="body" color={titleColor}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="callout" color="textSecondary" numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      {right}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          thumbColor={colors.surface}
          ios_backgroundColor={colors.borderStrong}
          accessibilityLabel={title}
        />
      ) : null}
      {onPress && !toggle ? <ChevronRight size={20} color={colors.textTertiary} /> : null}
    </View>
  );

  if (onPress && !toggle) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.6 }]}>
        {content}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={styles.pressable}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: { minHeight: 56, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
});
