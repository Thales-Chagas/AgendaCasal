import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText, IconButton, Screen, useTheme } from '@/design-system';
import { X } from '@/design-system/icons';
import { privacyPolicy, termsOfUse } from '@/features/legal/content';
import { goBackOrHome } from '@/shared/navigation';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { spacing } = useTheme();
  const content = doc === 'terms' ? termsOfUse : privacyPolicy;

  return (
    <Screen>
      <View style={{ alignItems: 'flex-end', marginRight: -spacing.md }}>
        <IconButton icon={X} label="Fechar" onPress={() => goBackOrHome()} />
      </View>
      <AppText variant="title1" accessibilityRole="header">
        {content.title}
      </AppText>
      <AppText variant="caption" color="textSecondary" style={{ marginBottom: spacing.xl }}>
        Atualizado em {content.updatedAt}
      </AppText>
      <View style={{ gap: spacing.xl }}>
        {content.sections.map((section) => (
          <View key={section.heading} style={{ gap: spacing.xs }}>
            <AppText variant="bodyStrong" accessibilityRole="header">
              {section.heading}
            </AppText>
            <AppText variant="body" color="textSecondary">
              {section.body}
            </AppText>
          </View>
        ))}
      </View>
    </Screen>
  );
}
