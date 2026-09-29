import { router } from 'expo-router';
import { View } from 'react-native';

import { usePreferences } from '@/core/preferences/preferences-store';
import { AppText, ListRow, Screen, useTheme } from '@/design-system';
import { Compass, HeartHandshake, Link2 } from '@/design-system/icons';
import { useSession } from '@/features/auth/session-store';
import { Illustration } from '@/features/onboarding/components/Illustration';

/** Primeiro acesso: três caminhos, nenhum obrigatório. */
export default function StartScreen() {
  const { spacing } = useTheme();
  const userId = useSession((s) => s.userId);
  const markDone = usePreferences((s) => s.markStartChoiceDone);

  const choose = (target: '/couple/invite' | '/couple/join' | '/') => {
    if (userId) markDone(userId);
    router.replace('/');
    if (target !== '/') router.push(target);
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginVertical: spacing.xl }}>
        <Illustration icon={HeartHandshake} />
      </View>
      <AppText variant="title1" align="center" accessibilityRole="header">
        Como você quer começar?
      </AppText>
      <AppText
        variant="body"
        color="textSecondary"
        align="center"
        style={{ marginTop: spacing.sm, marginBottom: spacing.xxl }}>
        Você pode conectar seu parceiro agora ou depois.
      </AppText>
      <View style={{ gap: spacing.sm }}>
        <ListRow
          icon={HeartHandshake}
          iconTone="primary"
          title="Criar nossa agenda"
          subtitle="Gere um convite para seu parceiro"
          onPress={() => choose('/couple/invite')}
          testID="start-create"
        />
        <ListRow
          icon={Link2}
          iconTone="primary"
          title="Entrar com convite"
          subtitle="Recebi um código do meu parceiro"
          onPress={() => choose('/couple/join')}
          testID="start-join"
        />
        <ListRow
          icon={Compass}
          iconTone="textSecondary"
          title="Explorar primeiro"
          subtitle="Conhecer o app e conectar depois"
          onPress={() => choose('/')}
          testID="start-explore"
        />
      </View>
    </Screen>
  );
}
