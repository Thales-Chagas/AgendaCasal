import { Platform, type ViewStyle } from 'react-native';

/** Grade de 4 pontos. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Alvos de toque: mínimo de 48 pontos (acessibilidade). */
export const touch = {
  minSize: 48,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

/** Largura máxima de conteúdo (tablets / web de desenvolvimento). */
export const maxContentWidth = 560;

type ShadowName = 'card' | 'raised';

/** Apenas duas sombras, sempre suaves. No tema escuro, bordas substituem sombras. */
export const shadows: Record<ShadowName, ViewStyle> = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#2A1F28',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 1 },
    default: { boxShadow: '0 4px 12px rgba(42, 31, 40, 0.06)' },
  }),
  raised: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#2A1F28',
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: { boxShadow: '0 8px 24px rgba(42, 31, 40, 0.12)' },
  }),
};

export const motion = {
  duration: { fast: 150, normal: 220, slow: 320 },
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  pressScale: 0.97,
} as const;
