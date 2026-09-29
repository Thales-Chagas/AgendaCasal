import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

export type Segment<T extends string> = { value: T; label: string };

export type SegmentedControlProps<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** Alternância entre visões (ex.: Hoje · Semana · Mês · Próximos). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors, radius, spacing, elevation } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        { backgroundColor: colors.surfaceMuted, borderRadius: radius.lg, padding: spacing.xs },
      ]}>
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={segment.label}
            onPress={() => onChange(segment.value)}
            style={[
              styles.segment,
              { borderRadius: radius.md },
              selected && [{ backgroundColor: colors.surface }, elevation('card')],
            ]}>
            <AppText
              variant="callout"
              compact
              color={selected ? 'textPrimary' : 'textSecondary'}
              numberOfLines={1}>
              {segment.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
