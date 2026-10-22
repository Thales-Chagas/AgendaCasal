import { useEffect, useState, type PropsWithChildren } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { maxContentWidth, motion } from '../tokens/layout';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

export type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  testID?: string;
}>;

// Sobe rápido e assenta devagar, sem quique; desce acelerando, como quem é dispensado.
const easeOutSheet = Easing.bezier(0.32, 0.72, 0, 1);
const easeInSheet = Easing.bezier(0.4, 0, 0.9, 0.6);
const { sheet } = motion;

const sheetEntering = SlideInDown.duration(sheet.enter).easing(easeOutSheet);
const sheetExiting = SlideOutDown.duration(sheet.exit).easing(easeInSheet);
const backdropEntering = FadeIn.duration(sheet.backdropIn).easing(Easing.out(Easing.quad));
const backdropExiting = FadeOut.duration(sheet.backdropOut).easing(Easing.in(Easing.quad));

/** Folha que sobe da parte de baixo: ações ao alcance do polegar. */
export function BottomSheet({ visible, onClose, title, children, testID }: BottomSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  // O Modal continua aberto até a folha terminar de descer; sem isso a saída some de uma vez.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (visible) return;
    const timer = setTimeout(() => setMounted(false), sheet.exit);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <Modal
      visible={visible || mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View
        style={styles.root}
        testID={visible ? testID : undefined}
        pointerEvents={visible ? 'auto' : 'none'}>
        {visible ? (
          <Animated.View
            entering={backdropEntering}
            exiting={backdropExiting}
            style={StyleSheet.absoluteFill}>
            <Pressable
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            />
          </Animated.View>
        ) : null}
        {visible ? (
          <Animated.View
            entering={sheetEntering}
            exiting={sheetExiting}
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingBottom: insets.bottom + spacing.lg,
                paddingHorizontal: spacing.xl,
              },
            ]}>
            <View
              style={[styles.handle, { backgroundColor: colors.borderStrong, marginVertical: spacing.md }]}
            />
            {title ? (
              <AppText variant="title3" accessibilityRole="header" style={{ marginBottom: spacing.md }}>
                {title}
              </AppText>
            ) : null}
            {children}
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center' },
});
