import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { toAppError } from '@/core/errors/app-error';
import { AppText, Button, CodeInput, Screen, toast, useTheme } from '@/design-system';
import { getAuthRepository } from '@/features/auth/auth-service';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { otpSchema } from '@/features/auth/schemas';

const RESEND_SECONDS = 60;

export default function ConfirmEmailScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { spacing } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const confirm = async (value = code) => {
    const parsed = otpSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await getAuthRepository().confirmSignUp(email, parsed.data);
      toast.success('Conta confirmada. Bem-vindo(a)! ❤️');
      // A sessão ativa leva automaticamente para a área do app.
    } catch (e) {
      setError(toAppError(e).userMessage);
      setSubmitting(false);
    }
  };

  const resend = async () => {
    try {
      await getAuthRepository().resendSignUpCode(email);
      setCooldown(RESEND_SECONDS);
      toast.info('Enviamos um novo código.');
    } catch (e) {
      toast.error(toAppError(e).userMessage);
    }
  };

  return (
    <Screen
      footer={
        <Button label="Confirmar" onPress={() => confirm()} loading={submitting} testID="confirm-submit" />
      }>
      <AuthHeader title="Confira seu e-mail" subtitle={`Enviamos um código de 6 números para ${email}.`} />
      <View style={{ gap: spacing.xxl }}>
        <CodeInput value={code} onChange={setCode} error={error} autoFocus onComplete={(v) => confirm(v)} />
        <View style={{ gap: spacing.xs, alignItems: 'center' }}>
          <AppText variant="callout" color="textSecondary" align="center">
            Não chegou? Olhe também a caixa de spam.
          </AppText>
          <Button
            label={cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}
            variant="ghost"
            size="sm"
            fullWidth={false}
            disabled={cooldown > 0}
            onPress={resend}
          />
        </View>
      </View>
    </Screen>
  );
}
