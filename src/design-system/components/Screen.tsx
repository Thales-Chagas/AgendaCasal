import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { maxContentWidth } from '../tokens/layout';
import { useTheme } from '../theme/theme';

export type ScreenProps = PropsWithChildren<{
  /** Rolagem vertical (padrão). Use false quando o conteúdo tem lista própria. */
  scroll?: boolean;
  /** Bordas seguras aplicadas. Telas com cabeçalho nativo normalmente dispensam "top". */
  edges?: Edge[];
  /** Conteúdo fixo na parte de baixo (botões de ação, ao alcance do polegar). */
  footer?: ReactNode;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}>;

/** Estrutura base de toda tela: fundo, áreas seguras, teclado e largura máxima. */
export function Screen({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  footer,
  padded = true,
  refreshing,
  onRefresh,
  contentStyle,
  testID,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: edges.includes('top') ? insets.top + spacing.sm : spacing.sm,
    paddingBottom: footer ? spacing.lg : (edges.includes('bottom') ? insets.bottom : 0) + spacing.xxl,
    paddingHorizontal: padded ? spacing.xl : 0,
  };

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }>
      <View style={styles.maxWidth}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.fill, padding, contentStyle]}>
      <View style={[styles.maxWidth, styles.fill]}>{children}</View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      testID={testID}
      style={[styles.fill, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {content}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: (edges.includes('bottom') ? insets.bottom : 0) + spacing.md,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}>
          <View style={styles.maxWidth}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  maxWidth: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
