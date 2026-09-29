import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button, Card, CoupleAvatar, useTheme } from '@/design-system';
import { HeartHandshake } from '@/design-system/icons';
import type { Person } from '@/features/couple/data/couple-repository';

/** Convite gentil para conectar o parceiro (nunca obrigatório). */
export function ConnectPartnerCard({ me }: { me: Person }) {
  const { spacing } = useTheme();
  return (
    <Card testID="connect-partner-card">
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <CoupleAvatar me={{ name: me.displayName, color: me.avatarColor }} size={40} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Conectar com meu parceiro</AppText>
            <AppText variant="caption" color="textSecondary">
              Assim a agenda aparece para vocês dois.
            </AppText>
          </View>
        </View>
        <Button
          label="Enviar convite"
          icon={HeartHandshake}
          variant="secondary"
          size="md"
          onPress={() => router.push('/couple/invite')}
        />
      </View>
    </Card>
  );
}
