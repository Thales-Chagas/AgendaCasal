/**
 * Paleta "rosé e areia".
 *
 * Cores de marca ficam em `palette`. As telas NUNCA usam a paleta diretamente:
 * usam os tokens semânticos de `lightColors` / `darkColors` via `useTheme()`.
 * O contraste de cada par texto/fundo é verificado em `colors.test.ts`.
 */
export const palette = {
  rose50: '#FCF1F4',
  rose100: '#F9E4EA',
  rose300: '#EFA3B7',
  rose400: '#F0819E',
  rose600: '#B8385A',
  rose700: '#9A2C4A',
  rose900: '#3A1A25',

  sand50: '#FBF8F6',
  sand100: '#F5EFEB',
  sand200: '#EDE4DE',
  sand300: '#DDD0C8',

  plum950: '#161216',
  plum900: '#201A20',
  plum850: '#2A232A',
  plum800: '#3A313A',
  plum700: '#54485A',
  ink: '#2A1F28',

  white: '#FFFFFF',
} as const;

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  overlay: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;

  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimarySoft: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  /** "Meu compromisso" */
  mine: string;
  mineSoft: string;
  /** "Compromisso do parceiro" */
  partner: string;
  partnerSoft: string;
  /** "Nosso compromisso" */
  ours: string;
  oursSoft: string;

  /** Área de notas privadas */
  private: string;
  privateSoft: string;

  focusRing: string;
  skeleton: string;
  tabBar: string;
};

export const lightColors: ColorTokens = {
  background: palette.sand50,
  surface: palette.white,
  surfaceMuted: palette.sand100,
  surfaceSunken: palette.sand200,
  border: '#EAE1DB',
  borderStrong: palette.sand300,
  overlay: 'rgba(22, 18, 22, 0.45)',

  textPrimary: palette.ink,
  textSecondary: '#66575F',
  textTertiary: '#7D6D76',
  textOnPrimary: palette.white,

  primary: palette.rose600,
  primaryPressed: palette.rose700,
  primarySoft: palette.rose100,
  onPrimarySoft: '#8E2644',

  success: '#23704F',
  successSoft: '#E1F2EA',
  warning: '#8F5205',
  warningSoft: '#FBEFD9',
  danger: '#B3261E',
  dangerSoft: '#FBE7E4',
  info: '#34508F',
  infoSoft: '#E6ECF8',

  mine: '#3F4FB0',
  mineSoft: '#E7E9FA',
  partner: '#12716D',
  partnerSoft: '#DDF2F0',
  ours: palette.rose600,
  oursSoft: palette.rose100,

  private: '#5A4B7A',
  privateSoft: '#EEEAF6',

  focusRing: palette.rose400,
  skeleton: palette.sand200,
  tabBar: palette.white,
};

export const darkColors: ColorTokens = {
  background: palette.plum950,
  surface: palette.plum900,
  surfaceMuted: palette.plum850,
  surfaceSunken: '#100D10',
  border: '#352C35',
  borderStrong: palette.plum700,
  overlay: 'rgba(0, 0, 0, 0.6)',

  textPrimary: '#F6EFF3',
  textSecondary: '#C2B5BD',
  textTertiary: '#A3949D',
  textOnPrimary: '#2B0D18',

  primary: palette.rose400,
  primaryPressed: palette.rose300,
  primarySoft: palette.rose900,
  onPrimarySoft: '#F7B8C8',

  success: '#6FD0A0',
  successSoft: '#17332A',
  warning: '#F2B65E',
  warningSoft: '#3A2A12',
  danger: '#F28B7F',
  dangerSoft: '#3D1C1A',
  info: '#9DB5F0',
  infoSoft: '#1D2640',

  mine: '#A3AEF7',
  mineSoft: '#23284A',
  partner: '#66D1C9',
  partnerSoft: '#163230',
  ours: palette.rose400,
  oursSoft: palette.rose900,

  private: '#C4B5EC',
  privateSoft: '#2A2440',

  focusRing: palette.rose300,
  skeleton: palette.plum850,
  tabBar: palette.plum900,
};
