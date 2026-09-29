import { StyleSheet, View } from 'react-native';

import { AppText, PressableScale, useTheme } from '@/design-system';
import { Heart, User, UserRound, type Icon } from '@/design-system/icons';

import type { Responsibility } from '../domain/types';

type Props = {
  value: Responsibility;
  onChange: (value: Responsibility) => void;
  partnerName: string | null;
};

/** "De quem é?": três opções grandes, com ícone e texto (não depende de cor). */
export function ScopePicker({ value, onChange, partnerName }: Props) {
  const { colors, radius, spacing } = useTheme();
  const options: { key: Responsibility; label: string; icon: Icon; disabled?: boolean }[] = [
    { key: 'mine', label: 'Meu', icon: User },
    {
      key: 'partner',
      label: partnerName ? `De ${partnerName}` : 'Do parceiro',
      icon: UserRound,
      disabled: !partnerName,
    },
    { key: 'ours', label: 'Nosso', icon: Heart },
  ];

  return (
    <View
      style={[styles.row, { gap: spacing.sm }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="De quem é">
      {options.map((option) => {
        const selected = value === option.key;
        const IconComponent = option.icon;
        const tone = colors[option.key];
        return (
          <PressableScale
            key={option.key}
            testID={`scope-${option.key}`}
            disabled={option.disabled}
            onPress={() => onChange(option.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: !!option.disabled }}
            accessibilityLabel={option.label}
            accessibilityHint={option.disabled ? 'Conecte seu parceiro para usar esta opção' : undefined}
            style={[
              styles.option,
              {
                borderRadius: radius.lg,
                gap: spacing.xs,
                borderColor: selected ? tone : colors.border,
                backgroundColor: selected ? colors[`${option.key}Soft`] : colors.surface,
                opacity: option.disabled ? 0.45 : 1,
              },
            ]}>
            <IconComponent size={20} color={selected ? tone : colors.textSecondary} strokeWidth={2.2} />
            <AppText
              variant="callout"
              compact
              numberOfLines={1}
              style={{ color: selected ? tone : colors.textPrimary }}>
              {option.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  option: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 4,
  },
});
