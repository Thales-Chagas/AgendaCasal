import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { usePreferences } from '@/core/preferences/preferences-store';

import { darkColors, lightColors, type ColorTokens } from '../tokens/colors';
import { motion, radius, shadows, spacing } from '../tokens/layout';
import { typography } from '../tokens/typography';

export type Theme = {
  scheme: 'light' | 'dark';
  colors: ColorTokens;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  motion: typeof motion;
  /** No tema escuro, sombras são substituídas por bordas. */
  elevation: (level: keyof typeof shadows) => object;
};

function buildTheme(scheme: 'light' | 'dark'): Theme {
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return {
    scheme,
    colors,
    typography,
    spacing,
    radius,
    motion,
    elevation: (level) =>
      scheme === 'dark' ? { borderWidth: 1, borderColor: colors.border } : shadows[level],
  };
}

const lightTheme = buildTheme('light');
const darkTheme = buildTheme('dark');

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: PropsWithChildren) {
  const preference = usePreferences((s) => s.theme);
  const system = useColorScheme();
  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const theme = useMemo(() => (scheme === 'dark' ? darkTheme : lightTheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
