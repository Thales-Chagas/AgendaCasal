import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { env } from '@/core/config/env';
import { useAppFonts } from '@/core/fonts';
import { startConnectivityMonitoring } from '@/core/network/connectivity';
import { usePreferences } from '@/core/preferences/preferences-store';
import { queryClient } from '@/core/query/query-client';
import { ThemeProvider, ToastHost, useTheme } from '@/design-system';
import { startAuth } from '@/features/auth/auth-service';
import { useSession } from '@/features/auth/session-store';
import { NotConfiguredScreen } from '@/features/onboarding/components/NotConfiguredScreen';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const status = useSession((s) => s.status);

  useEffect(() => {
    startConnectivityMonitoring();
    void startAuth();
  }, []);

  const ready = fontsReady && status !== 'loading';
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <NavigationTheme>{env ? <RootStack /> : <NotConfiguredScreen />}</NavigationTheme>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function NavigationTheme({ children }: { children: React.ReactNode }) {
  const { scheme, colors } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.textPrimary,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </NavigationThemeProvider>
  );
}

function RootStack() {
  const { colors } = useTheme();
  const signedIn = useSession((s) => s.status === 'signedIn');
  const seenOnboarding = usePreferences((s) => s.hasSeenOnboarding);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn && !seenOnboarding}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Screen name="convite/[code]" />
        <Stack.Screen name="legal/[doc]" options={{ presentation: 'modal' }} />
      </Stack>
      <ToastHost bottomOffset={signedIn ? 72 : 0} />
    </>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
