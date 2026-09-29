import { StyleSheet } from 'react-native';

import { Check, type Icon } from '../icons';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: Icon;
  emoji?: string;
  testID?: string;
};

/** Opção selecionável (categorias, atalhos de data, filtros). */
export function Chip({ label, selected, onPress, icon: IconComponent, emoji, testID }: ChipProps) {
  const { colors, radius, spacing } = useTheme();
  const fg = selected ? colors.onPrimarySoft : colors.textPrimary;

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          borderRadius: radius.pill,
          paddingHorizontal: spacing.lg,
          gap: spacing.xs + 2,
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}>
      {selected ? <Check size={16} color={fg} strokeWidth={2.6} /> : null}
      {!selected && IconComponent ? <IconComponent size={16} color={fg} /> : null}
      <AppText variant="callout" compact style={{ color: fg }}>
        {emoji ? `${emoji} ${label}` : label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
});
