import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, IconButton, useTheme } from '@/design-system';
import { ChevronLeft } from '@/design-system/icons';

type Props = { title: string; subtitle?: string; showBack?: boolean };

export function AuthHeader({ title, subtitle, showBack = true }: Props) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }}>
      {showBack && router.canGoBack() ? (
        <View style={{ marginLeft: -spacing.md, marginBottom: spacing.sm }}>
          <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={{ height: spacing.xxl }} />
      )}
      <AppText variant="title1" accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="body" color="textSecondary">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
