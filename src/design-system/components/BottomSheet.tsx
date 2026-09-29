import type { PropsWithChildren } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { maxContentWidth } from '../tokens/layout';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

export type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  testID?: string;
}>;

/** Folha que sobe da parte de baixo: ações ao alcance do polegar. */
export function BottomSheet({ visible, onClose, title, children, testID }: BottomSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <View style={styles.root} testID={testID}>
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(160)}
            style={StyleSheet.absoluteFill}>
            <Pressable
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(200)}
            exiting={SlideOutDown.duration(180)}
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
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center' },
});
