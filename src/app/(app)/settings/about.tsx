import * as Application from 'expo-application';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Card, ListRow, Screen, ScreenHeader, useTheme } from '@/design-system';
import { FileText, Heart } from '@/design-system/icons';

export default function AboutScreen() {
  const { spacing, colors } = useTheme();
  return (
    <Screen>
      <ScreenHeader title="Sobre" />
      <View style={{ alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xl }}>
        <Heart size={40} color={colors.primary} fill={colors.primarySoft} />
        <AppText variant="title2">Nossa Agenda</AppText>
        <AppText variant="callout" color="textSecondary">
          Versão {Application.nativeApplicationVersion ?? '1.0.0'}
          {Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ''}
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          Uma agenda para vocês dois, com um cantinho privado para cada um.
        </AppText>
      </View>
      <Card padded={false}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <ListRow icon={FileText} title="Termos de Uso" onPress={() => router.push('/legal/terms')} />
          <ListRow
            icon={FileText}
            title="Política de Privacidade"
            onPress={() => router.push('/legal/privacy')}
          />
        </View>
      </Card>
    </Screen>
  );
}
