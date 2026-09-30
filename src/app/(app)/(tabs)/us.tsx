import { differenceInCalendarDays } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { toAppError } from '@/core/errors/app-error';
import {
  AppText,
  Button,
  Card,
  ConfirmDialog,
  ListRow,
  Screen,
  SectionHeader,
  Skeleton,
  toast,
  useTheme,
} from '@/design-system';
import {
  Bell,
  CircleQuestionMark,
  Gift,
  HeartHandshake,
  Info,
  LogOut,
  Palette,
  Shield,
  UserRound,
} from '@/design-system/icons';
import { signOut as signOutAccount } from '@/features/account/account-actions';
import { usePeople } from '@/features/couple/hooks';
import { daysUntilLabel, kindMeta, specialDateSubtitle } from '@/features/special-dates/domain/presentation';
import { useSpecialDates } from '@/features/special-dates/hooks';
import { useAgendaStatus } from '@/features/sync/agenda-runtime';
import { CouplePersonAvatar } from '@/features/couple/components/PersonAvatar';

export default function UsScreen() {
  const { spacing } = useTheme();
  const { me, partner, space } = usePeople();
  const { data: specialDates = [] } = useSpecialDates();
  const pending = useAgendaStatus((s) => s.pending);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const daysTogether = space?.connectedAt
    ? differenceInCalendarDays(new Date(), new Date(space.connectedAt))
    : null;

  const signOut = async () => {
    setConfirmSignOut(false);
    try {
      await signOutAccount();
    } catch (error) {
      toast.error(toAppError(error).userMessage);
    }
  };

  return (
    <Screen edges={['top']} contentStyle={{ paddingBottom: 120 }}>
      <AppText variant="title1" accessibilityRole="header" style={{ marginBottom: spacing.lg }}>
        Nosso espaço
      </AppText>

      <Card>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
          {me ? (
            <CouplePersonAvatar me={me} partner={partner} size={72} />
          ) : (
            <Skeleton width={120} height={72} radius={36} />
          )}
          <AppText variant="title2" align="center">
            {me ? (partner ? `${me.displayName} & ${partner.displayName}` : me.displayName) : ' '}
          </AppText>
          {partner && daysTogether !== null ? (
            <AppText variant="callout" color="textSecondary">
              {daysTogether === 0
                ? 'Conectados hoje ❤️'
                : `Juntos no app há ${daysTogether} ${daysTogether === 1 ? 'dia' : 'dias'}`}
            </AppText>
          ) : (
            <Button
              label="Conectar com meu parceiro"
              icon={HeartHandshake}
              variant="secondary"
              size="md"
              fullWidth={false}
              onPress={() => router.push('/couple/invite')}
            />
          )}
        </View>
      </Card>

      <View style={{ marginTop: spacing.xl }}>
        <SectionHeader
          title="Datas especiais"
          actionLabel={specialDates.length ? 'Ver todas' : undefined}
          onAction={() => router.push('/special-dates')}
        />
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.lg }}>
            {specialDates.slice(0, 3).map(({ item, occurrence, key }) => (
              <ListRow
                key={key}
                title={`${kindMeta[item.kind].emoji} ${item.title}`}
                subtitle={`${specialDateSubtitle(item, occurrence)} · ${daysUntilLabel(occurrence)}`}
                onPress={() => router.push({ pathname: '/special-date/[id]', params: { id: item.id } })}
              />
            ))}
            <ListRow
              icon={Gift}
              iconTone="primary"
              title="Adicionar data especial"
              subtitle="Aniversários, namoro, casamento…"
              onPress={() => router.push('/special-date/new')}
            />
          </View>
        </Card>
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <SectionHeader title="Configurações" />
        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.lg }}>
            <ListRow
              icon={UserRound}
              title="Minha conta"
              subtitle="Nome, senha e dados"
              onPress={() => router.push('/settings/account')}
            />
            <ListRow
              icon={Palette}
              title="Aparência"
              subtitle="Tema claro ou escuro"
              onPress={() => router.push('/settings/theme')}
            />
            <ListRow
              icon={Bell}
              title="Notificações"
              onPress={() => router.push('/settings/notifications')}
            />
            <ListRow
              icon={Shield}
              title="Privacidade"
              subtitle="O que é compartilhado e o que não é"
              onPress={() => router.push('/settings/privacy')}
            />
            <ListRow
              icon={HeartHandshake}
              title="Nosso relacionamento"
              subtitle={partner ? 'Gerenciar vínculo' : 'Convidar ou entrar com convite'}
              onPress={() => router.push('/settings/relationship')}
            />
            <ListRow icon={CircleQuestionMark} title="Ajuda" onPress={() => router.push('/settings/help')} />
            <ListRow icon={Info} title="Sobre" onPress={() => router.push('/settings/about')} />
            <ListRow
              icon={LogOut}
              title="Sair"
              destructive
              onPress={() => setConfirmSignOut(true)}
              testID="sign-out"
            />
          </View>
        </Card>
      </View>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Sair da conta?"
        message={
          pending > 0
            ? 'Algumas alterações ainda não foram enviadas (sem internet). Se sair agora, elas serão perdidas. Suas notas privadas continuam guardadas neste celular.'
            : 'Você pode entrar de novo quando quiser. Suas notas privadas continuam guardadas neste celular.'
        }
        confirmLabel="Sair"
        destructive
        onConfirm={signOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}
