import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { toAppError } from '@/core/errors/app-error';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  Screen,
  ScreenHeader,
  Skeleton,
  toast,
  useTheme,
} from '@/design-system';
import { Copy, RefreshCw, Share2 } from '@/design-system/icons';
import { buildInviteLink, buildInviteMessage, formatInviteCode } from '@/features/couple/domain/invite-code';
import { useActiveInvite, useMySpace, useRenewInvite } from '@/features/couple/hooks';
import { useNow } from '@/shared/hooks/use-now';

export default function InviteScreen() {
  const { spacing, colors, radius } = useTheme();
  const { data: space } = useMySpace();
  const alreadyPaired = !!space?.partner;
  const invite = useActiveInvite(space?.coupleId, !!space && !alreadyPaired);
  const renew = useRenewInvite(space?.coupleId);
  const now = useNow();

  // O parceiro aceitou (chega em tempo real) → celebração.
  useEffect(() => {
    if (alreadyPaired) router.replace('/couple/connected');
  }, [alreadyPaired]);

  const code = invite.data?.code;
  const expiresAt = invite.data ? new Date(invite.data.expiresAt) : null;
  const hoursLeft = expiresAt
    ? Math.max(1, Math.round((expiresAt.getTime() - now.getTime()) / 3_600_000))
    : 0;

  const share = async () => {
    if (!code || !space) return;
    try {
      await Share.share({ message: buildInviteMessage(space.me.displayName, code) });
    } catch {
      toast.error('Não conseguimos abrir o compartilhamento.');
    }
  };

  const copy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(formatInviteCode(code));
    toast.success('Código copiado');
  };

  return (
    <Screen
      footer={
        code ? (
          <View style={{ gap: spacing.sm }}>
            <Button label="Enviar convite" icon={Share2} onPress={share} testID="invite-share" />
            <Button label="Copiar código" icon={Copy} variant="ghost" onPress={copy} />
          </View>
        ) : null
      }>
      <ScreenHeader
        leading="close"
        title="Conectar com meu parceiro"
        subtitle="Envie o convite. Quando seu parceiro aceitar, a agenda de vocês fica compartilhada."
      />

      {invite.isError ? (
        <ErrorState message={toAppError(invite.error).userMessage} onRetry={() => void invite.refetch()} />
      ) : (
        <Card>
          <View style={[styles.center, { gap: spacing.lg, paddingVertical: spacing.md }]}>
            <AppText variant="label" color="textSecondary">
              CÓDIGO DO CONVITE
            </AppText>
            {code ? (
              <AppText
                variant="display"
                tabular
                selectable
                testID="invite-code"
                accessibilityLabel={`Código ${code.split('').join(' ')}`}
                style={styles.code}>
                {formatInviteCode(code)}
              </AppText>
            ) : (
              <Skeleton width={220} height={40} />
            )}
            <View
              style={[
                styles.qr,
                { borderRadius: radius.lg, backgroundColor: '#FFFFFF', padding: spacing.md },
              ]}>
              {code ? (
                <QRCode value={buildInviteLink(code)} size={168} color="#2A1F28" backgroundColor="#FFFFFF" />
              ) : (
                <Skeleton width={168} height={168} />
              )}
            </View>
            <AppText variant="caption" color="textSecondary" align="center">
              Seu parceiro pode escanear o QR Code, tocar no link ou digitar o código em{'\n'}
              “Entrar com convite”. Vale por {hoursLeft} {hoursLeft === 1 ? 'hora' : 'horas'} e só pode ser
              usado uma vez.
            </AppText>
          </View>
        </Card>
      )}

      <View style={[styles.waiting, { gap: spacing.sm, marginTop: spacing.xl }]}>
        <View style={[styles.pulse, { backgroundColor: colors.primary }]} />
        <AppText variant="callout" color="textSecondary">
          Aguardando seu parceiro aceitar…
        </AppText>
      </View>

      <Button
        label="Gerar novo código"
        icon={RefreshCw}
        variant="ghost"
        size="sm"
        fullWidth={false}
        style={[styles.center, { marginTop: spacing.md }]}
        loading={renew.isPending}
        onPress={() =>
          renew.mutate(undefined, {
            onSuccess: () => toast.info('Novo código gerado. O anterior deixou de valer.'),
            onError: (e) => toast.error(toAppError(e).userMessage),
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', alignSelf: 'center' },
  code: { letterSpacing: 2 },
  qr: { alignItems: 'center', justifyContent: 'center' },
  waiting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pulse: { width: 8, height: 8, borderRadius: 4 },
});
