import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChevronLeft, X } from '../icons';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  /** "back" em telas empilhadas, "close" em telas modais. */
  leading?: 'back' | 'close' | 'none';
  trailing?: ReactNode;
  onLeadingPress?: () => void;
};

/** Cabeçalho simples: a pessoa sempre sabe onde está e como voltar. */
export function ScreenHeader({
  title,
  subtitle,
  leading = 'back',
  trailing,
  onLeadingPress,
}: ScreenHeaderProps) {
  const { spacing } = useTheme();
  const goBack = onLeadingPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  return (
    <View style={{ marginBottom: spacing.lg, gap: spacing.xs }}>
      <View style={[styles.bar, { marginHorizontal: -spacing.md }]}>
        {leading === 'none' ? (
          <View />
        ) : (
          <IconButton
            icon={leading === 'close' ? X : ChevronLeft}
            label={leading === 'close' ? 'Fechar' : 'Voltar'}
            onPress={goBack}
            testID="header-leading"
          />
        )}
        <View style={styles.trailing}>{trailing}</View>
      </View>
      {title ? (
        <AppText variant="title1" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      {subtitle ? (
        <AppText variant="body" color="textSecondary">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  trailing: { flexDirection: 'row', alignItems: 'center' },
});
