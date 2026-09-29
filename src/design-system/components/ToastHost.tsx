import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Check, CircleAlert, Info } from '../icons';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { useToastStore } from './toast-store';

/** Mensagem curta de confirmação na parte de baixo da tela (com "Desfazer" opcional). */
export function ToastHost({ bottomOffset = 0 }: { bottomOffset?: number }) {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);
  const { colors, radius, spacing, elevation } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    AccessibilityInfo.announceForAccessibility(current.message);
    const timer = setTimeout(() => dismiss(current.id), current.durationMs);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;

  const IconComponent = current.tone === 'success' ? Check : current.tone === 'error' ? CircleAlert : Info;
  const iconColor =
    current.tone === 'success' ? colors.success : current.tone === 'error' ? colors.danger : colors.info;

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + bottomOffset + spacing.lg }]}>
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(220)}
        exiting={FadeOutDown.duration(180)}
        accessibilityRole="alert"
        style={[
          styles.toast,
          {
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.lg,
            gap: spacing.md,
          },
          elevation('raised'),
        ]}>
        <IconComponent size={20} color={iconColor} strokeWidth={2.4} />
        <AppText variant="callout" style={styles.message}>
          {current.message}
        </AppText>
        {current.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => {
              current.action?.onPress();
              dismiss(current.id);
            }}
            style={styles.action}>
            <AppText variant="bodyStrong" color="primary">
              {current.action.label}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 16, right: 16, alignItems: 'center', pointerEvents: 'box-none' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    width: '100%',
    maxWidth: 520,
  },
  message: { flex: 1, paddingVertical: 12 },
  action: { minHeight: 44, justifyContent: 'center' },
});
