import { Text, type TextProps } from 'react-native';

import type { ColorTokens } from '../tokens/colors';
import { maxFontScale, type TypographyVariant } from '../tokens/typography';
import { useTheme } from '../theme/theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: keyof ColorTokens;
  align?: 'left' | 'center' | 'right';
  /** Números com largura fixa (horários, contagens). */
  tabular?: boolean;
  /** Limita a ampliação em espaços fixos (abas, selos). */
  compact?: boolean;
};

export function AppText({
  variant = 'body',
  color = 'textPrimary',
  align,
  tabular,
  compact,
  style,
  ...rest
}: AppTextProps) {
  const { colors, typography } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={compact ? maxFontScale.compact : maxFontScale.standard}
      style={[
        typography[variant],
        { color: colors[color] },
        align && { textAlign: align },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
      {...rest}
    />
  );
}
