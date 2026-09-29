import { differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  ScreenHeader,
  toast,
  useTheme,
} from '@/design-system';
import { HeartHandshake, Link2 } from '@/design-system/icons';
import { useLeaveCouple, usePeople } from '@/features/couple/hooks';

export default function RelationshipScreen() {
  const { spacing } = useTheme();
  const { partner, space } = usePeople();
  const leave = useLeaveCouple();
  const [keepCopy, setKeepCopy] = useState(true);
  const [confirm, setConfirm] = useState(false);

  if (!partner) {
    return (
      <Screen>
        <ScreenHeader title="Nosso relacionamento" subtitle="Você ainda não está conectado a ninguém." />
        <View style={{ gap: spacing.sm }}>
          <ListRow
            icon={HeartHandshake}
            iconTone="primary"
            title="Convidar meu parceiro"
            onPress={() => router.push('/couple/invite')}
          />
          <ListRow
            icon={Link2}
            iconTone="primary"
            title="Entrar com convite"
            onPress={() => router.push('/couple/join')}
          />
        </View>
      </Screen>
    );
  }

  const since = space?.connectedAt ? new Date(space.connectedAt) : null;

  return (
    <Screen
      footer={
        <Button
          label="Desfazer vínculo"
          variant="danger"
          onPress={() => setConfirm(true)}
          testID="leave-couple"
        />
      }>
      <ScreenHeader
        title="Nosso relacionamento"
        subtitle={
          since
            ? `Conectados com ${partner.displayName} desde ${format(since, "d 'de' MMMM 'de' yyyy", { locale: ptBR })} (${differenceInCalendarDays(new Date(), since)} dias).`
            : undefined
        }
      />

      <AppText variant="title3" style={{ marginBottom: spacing.md }}>
        Se vocês desfizerem o vínculo:
      </AppText>
      <Card>
        <View style={{ gap: spacing.md }}>
          <Bullet text="Vocês deixarão de compartilhar a agenda." />
          <Bullet text="Os compromissos que são só seus vão com você." />
          <Bullet text={`Os compromissos de ${partner.displayName} ficam com ${partner.displayName}.`} />
          <Bullet
            text={`Os compromissos "Nosso" e as datas especiais continuam com ${partner.displayName}.`}
          />
          <Bullet text="Nada é apagado. As notas privadas não mudam." />
        </View>
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <ListRow
          title='Levar uma cópia dos compromissos "Nosso"'
          subtitle="E das datas especiais"
          toggle={{ value: keepCopy, onChange: setKeepCopy }}
        />
      </View>

      <ConfirmDialog
        visible={confirm}
        title={`Desfazer vínculo com ${partner.displayName}?`}
        message={
          keepCopy
            ? 'Você começa uma agenda própria, com seus compromissos e uma cópia dos compromissos de vocês dois.'
            : 'Você começa uma agenda própria só com os seus compromissos.'
        }
        confirmLabel="Sim, desfazer vínculo"
        destructive
        loading={leave.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          leave.mutate(keepCopy, {
            onSuccess: () => {
              setConfirm(false);
              toast.info('Vínculo desfeito. Sua agenda agora é só sua.');
              router.replace('/');
            },
            onError: (e) => {
              setConfirm(false);
              toast.error(toAppError(e).userMessage);
            },
          })
        }
      />
    </Screen>
  );
}

function Bullet({ text }: { text: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <AppText variant="body" color="textSecondary">
        •
      </AppText>
      <AppText variant="body" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
