import { router, useLocalSearchParams } from 'expo-router';
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
  TextField,
  useTheme,
} from '@/design-system';
import { KeyRound } from '@/design-system/icons';
import {
  formatInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from '@/features/couple/domain/invite-code';
import { useAcceptInvite, useMySpace, usePreviewInvite } from '@/features/couple/hooks';

export default function JoinScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { spacing } = useTheme();
  const { data: space } = useMySpace();
  const [input, setInput] = useState(params.code ? formatInviteCode(params.code) : '');
  const [bringEvents, setBringEvents] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const valid = isValidInviteCode(input);
  const preview = usePreviewInvite(valid ? normalizeInviteCode(input) : null);
  const accept = useAcceptInvite();

  const previewError = preview.error ? toAppError(preview.error).userMessage : null;
  const invalid = valid && preview.isFetched && !preview.data && !preview.error;
  const myEvents = preview.data?.myEventCount ?? 0;

  const doAccept = () => {
    setConfirmDiscard(false);
    accept.mutate(
      { code: normalizeInviteCode(input), bringMyEvents: bringEvents },
      { onSuccess: () => router.replace('/couple/connected') },
    );
  };

  if (space?.partner) {
    return (
      <Screen>
        <ScreenHeader leading="close" title="Vocês já estão conectados" />
        <AppText variant="body" color="textSecondary">
          Você já compartilha a agenda com {space.partner.displayName}. Para conectar outra pessoa, primeiro
          desfaça o vínculo em Nós › Nosso relacionamento.
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          label="Aceitar e conectar"
          onPress={() => (myEvents > 0 && !bringEvents ? setConfirmDiscard(true) : doAccept())}
          disabled={!preview.data}
          loading={accept.isPending}
          testID="join-accept"
        />
      }>
      <ScreenHeader
        leading="close"
        title="Entrar com convite"
        subtitle="Digite o código que seu parceiro enviou."
      />
      <View style={{ gap: spacing.xl }}>
        <TextField
          label="Código do convite"
          icon={KeyRound}
          placeholder="ABCD-2345"
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus={!params.code}
          maxLength={9}
          value={input}
          onChangeText={(text) => setInput(formatInviteCode(text))}
          error={
            previewError ??
            (invalid
              ? 'Este convite não é válido ou já expirou. Peça um novo ao seu parceiro.'
              : undefined) ??
            (accept.error ? toAppError(accept.error).userMessage : undefined)
          }
          testID="join-code"
        />

        {preview.data ? (
          <Card tone="primarySoft">
            <AppText variant="title3" align="center">
              {preview.data.inviterName} convidou você para compartilhar a agenda ❤️
            </AppText>
          </Card>
        ) : null}

        {preview.data && myEvents > 0 ? (
          <ListRow
            title={`Levar meus ${myEvents} ${myEvents === 1 ? 'compromisso' : 'compromissos'}`}
            subtitle="Eles passam a aparecer na agenda de vocês dois"
            toggle={{ value: bringEvents, onChange: setBringEvents }}
          />
        ) : null}
      </View>

      <ConfirmDialog
        visible={confirmDiscard}
        title="Começar sem seus compromissos?"
        message={`Seus ${myEvents} compromissos atuais serão apagados deste espaço. Se quiser mantê-los, ative "Levar meus compromissos".`}
        confirmLabel="Apagar e conectar"
        destructive
        onConfirm={doAccept}
        onCancel={() => setConfirmDiscard(false)}
      />
    </Screen>
  );
}
