import type { TextStyle } from 'react-native';

/** Carregadas em `core/fonts.ts`. Só os pesos realmente usados entram no app. */
export const fontFamilies = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export type TypographyVariant =
  'display' | 'title1' | 'title2' | 'title3' | 'body' | 'bodyStrong' | 'callout' | 'caption' | 'label';

/** Escala tipográfica. Todos os textos respeitam o tamanho de fonte do sistema. */
export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontFamily: fontFamilies.bold, fontSize: 32, lineHeight: 40, letterSpacing: -0.6 },
  title1: { fontFamily: fontFamilies.bold, fontSize: 26, lineHeight: 34, letterSpacing: -0.4 },
  title2: { fontFamily: fontFamilies.bold, fontSize: 21, lineHeight: 28, letterSpacing: -0.2 },
  title3: { fontFamily: fontFamilies.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: fontFamilies.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fontFamilies.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamilies.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
};

/** Limite de ampliação para elementos com espaço fixo (ex.: abas). Texto corrido não tem limite. */
export const maxFontScale = {
  compact: 1.3,
  standard: 2,
} as const;
