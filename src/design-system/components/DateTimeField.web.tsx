import { format } from 'date-fns';
import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import type { DateTimeFieldProps } from './DateTimeField';

export { formatFieldValue } from './DateTimeField.shared';

/** Web (apenas pré-visualização de desenvolvimento): inputs nativos do navegador. */
export function DateTimeField({ label, mode, value, onChange, testID }: DateTimeFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const inputValue = mode === 'date' ? format(value, 'yyyy-MM-dd') : format(value, 'HH:mm');

  return (
    <View
      style={[
        styles.field,
        {
          borderRadius: radius.md,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: spacing.sm,
        },
      ]}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      {createElement('input', {
        type: mode,
        value: inputValue,
        'data-testid': testID,
        'aria-label': label,
        onChange: (e: { target: { value: string } }) => {
          const raw = e.target.value;
          if (!raw) return;
          const next = new Date(value);
          if (mode === 'date') {
            const [y, m, d] = raw.split('-').map(Number) as [number, number, number];
            next.setFullYear(y, m - 1, d);
          } else {
            const [h, min] = raw.split(':').map(Number) as [number, number];
            next.setHours(h, min, 0, 0);
          }
          onChange(next);
        },
        style: {
          border: 'none',
          background: 'transparent',
          color: colors.textPrimary,
          fontFamily: typography.bodyStrong.fontFamily,
          fontSize: 16,
          padding: 4,
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({ field: { borderWidth: 1.5, flex: 1, minHeight: 60 } });
