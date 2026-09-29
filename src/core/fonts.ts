import { useFonts } from 'expo-font';

import { fontFamilies } from '@/design-system/tokens/typography';

/** Carrega apenas os quatro pesos usados pelo design system. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    [fontFamilies.regular]: require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'),
    [fontFamilies.medium]: require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf'),
    [fontFamilies.semibold]: require('@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'),
    [fontFamilies.bold]: require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'),
  });
  // Se a fonte falhar, seguimos com a do sistema em vez de travar o app.
  return loaded || !!error;
}
