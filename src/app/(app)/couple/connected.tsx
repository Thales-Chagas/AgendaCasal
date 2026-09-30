import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';

import { usePreferences } from '@/core/preferences/preferences-store';
import { AppText, Button, Screen, useTheme } from '@/design-system';
import { useSession } from '@/features/auth/session-store';
import { useMySpace } from '@/features/couple/hooks';
import { CouplePersonAvatar } from '@/features/couple/components/PersonAvatar';

/** Momento de celebração, curto e elegante. */
export default function ConnectedScreen() {
  const { spacing } = useTheme();
  const userId = useSession((s) => s.userId);
  const markDone = usePreferences((s) => s.markStartChoiceDone);
  const { data: space } = useMySpace();

  useEffect(() => {
    if (userId) markDone(userId);
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [userId, markDone]);

  return (
    <Screen
      scroll={false}
      footer={
        <Button label="Ver nossa agenda" onPress={() => router.replace('/')} testID="connected-continue" />
      }>
      <View style={[styles.center, { gap: spacing.xl }]}>
        <Animated.View entering={ZoomIn.springify().damping(12)}>
          {space ? <CouplePersonAvatar me={space.me} partner={space.partner} size={88} /> : null}
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={{ gap: spacing.sm }}>
          <AppText variant="display" align="center" accessibilityRole="header">
            Agora vocês estão conectados ❤️
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            {space?.partner
              ? `Tudo o que você ou ${space.partner.displayName} adicionarem na agenda aparece para os dois.`
              : 'A agenda de vocês agora é uma só.'}
          </AppText>
          <AppText variant="callout" color="textSecondary" align="center">
            🔒 As notas continuam privadas, cada uma no seu celular.
          </AppText>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
