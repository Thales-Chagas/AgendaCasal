import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Icon } from '../icons';
import { useTheme, type Theme } from '../theme/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: Icon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const heights: Record<Size, number> = { lg: 56, md: 48, sm: 40 };

function variantColors(variant: Variant, colors: Theme['colors']) {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary };
    case 'secondary':
      return { bg: colors.primarySoft, fg: colors.onPrimarySoft, border: colors.primarySoft };
    case 'outline':
      return { bg: 'transparent', fg: colors.textPrimary, border: colors.borderStrong };
    case 'ghost':
      return { bg: 'transparent', fg: colors.primary, border: 'transparent' };
    case 'danger':
      return { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon: IconComponent,
  loading,
  disabled,
  fullWidth = true,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const palette = variantColors(variant, colors);
  const inactive = disabled || loading;

  return (
    <PressableScale
      testID={testID}
      haptic={variant === 'primary'}
      onPress={onPress}
      disabled={inactive}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      hitSlop={size === 'sm' ? 4 : undefined}
      style={[
        styles.base,
        {
          minHeight: heights[size],
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: size === 'sm' ? radius.md : radius.lg,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={[styles.content, { gap: spacing.sm }]}>
          {IconComponent ? (
            <IconComponent size={size === 'sm' ? 18 : 20} color={palette.fg} strokeWidth={2.2} />
          ) : null}
          <AppText
            variant={size === 'sm' ? 'callout' : 'bodyStrong'}
            style={{ color: palette.fg }}
            numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
