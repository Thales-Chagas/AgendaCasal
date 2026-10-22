import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePreferences } from '@/core/preferences/preferences-store';
import { AppText, Button, ConfirmDialog, useTheme } from '@/design-system';
import { FingerprintPattern } from '@/design-system/icons';
import { signOut } from '@/features/account/account-actions';

import { useAppLock } from '../app-lock';
import { verifyBiometrics } from '../biometrics';

const icon = require('@/assets/images/icon.png');

/**
 * Tela de bloqueio por digital ou rosto, por cima do app (o app continua montado embaixo, então
 * ao desbloquear tudo está onde a pessoa deixou). Celular: a biometria aparece sozinha. Web: o
 * navegador exige um toque antes de pedir a biometria.
 */
export function AppLockGate({ userId, children }: PropsWithChildren<{ userId: string }>) {
  const enabled = usePreferences((s) => s.appLock);
  const locked = useAppLock((s) => s.locked);
  return (
    <>
      {children}
      {enabled && locked ? <LockScreen userId={userId} /> : null}
    </>
  );
}

function LockScreen({ userId }: { userId: string }) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const unlock = useAppLock((s) => s.unlock);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const tryUnlock = useCallback(async () => {
    setBusy(true);
    setError(undefined);
    const { ok } = await verifyBiometrics(userId, 'Desbloquear o DuoDay');
    setBusy(false);
    if (ok) unlock();
    else setError('Não deu certo. Tente de novo.');
  }, [unlock, userId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Logo depois de aparecer, a biometria do sistema abre sozinha.
    const timer = setTimeout(() => void tryUnlock(), 0);
    return () => clearTimeout(timer);
  }, [tryUnlock]);

  return (
    <Animated.View
      exiting={FadeOut.duration(220)}
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}>
      <View style={[styles.center, { gap: spacing.md }]}>
        <Image
          source={icon}
          style={[styles.icon, { borderRadius: radius.xl }]}
          accessibilityIgnoresInvertColors
        />
        <AppText variant="title2" align="center" accessibilityRole="header">
          DuoDay bloqueado
        </AppText>
        <AppText variant="callout" color="textSecondary" align="center">
          Use sua digital ou seu rosto para entrar.
        </AppText>
      </View>
      <View style={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}>
        {error ? (
          <AppText variant="caption" color="danger" align="center" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}
        <Button
          label="Desbloquear"
          icon={FingerprintPattern}
          onPress={() => void tryUnlock()}
          loading={busy}
          testID="app-unlock"
        />
        <Button label="Entrar com e-mail e senha" variant="ghost" onPress={() => setSignOutOpen(true)} />
      </View>
      <ConfirmDialog
        visible={signOutOpen}
        title="Entrar com e-mail e senha?"
        message="Você sai da conta neste aparelho e entra de novo com seu e-mail e sua senha. Suas notas continuam guardadas aqui."
        confirmLabel="Sair e entrar com senha"
        onCancel={() => setSignOutOpen(false)}
        onConfirm={() => {
          setSignOutOpen(false);
          void signOut();
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 1000, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  icon: { width: 88, height: 88 },
});
