import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';

import { toAppError } from '@/core/errors/app-error';
import { AppText, Button, Screen, TextField, useTheme } from '@/design-system';
import { Mail } from '@/design-system/icons';
import { getAuthRepository } from '@/features/auth/auth-service';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { signInSchema } from '@/features/auth/schemas';
import { useZodForm } from '@/shared/forms';

export default function SignInScreen() {
  const { spacing } = useTheme();
  const { control, handleSubmit, formState, setError, getValues } = useZodForm(signInSchema, {
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      await getAuthRepository().signIn(email, password);
      // A sessão ativa leva automaticamente para a área do app.
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === 'email_not_confirmed') {
        await getAuthRepository()
          .resendSignUpCode(email)
          .catch(() => undefined);
        router.push({ pathname: '/confirm-email', params: { email } });
        return;
      }
      setError('root', { message: appError.userMessage });
    }
  });

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button
            label="Entrar"
            onPress={onSubmit}
            loading={formState.isSubmitting}
            testID="sign-in-submit"
          />
          <Button label="Criar uma conta" variant="ghost" onPress={() => router.replace('/sign-up')} />
        </View>
      }>
      <AuthHeader title="Que bom te ver de novo" subtitle="Entre com seu e-mail e senha." />
      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              label="E-mail"
              icon={Mail}
              placeholder="voce@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              label="Senha"
              password
              autoComplete="current-password"
              textContentType="password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
              error={fieldState.error?.message}
            />
          )}
        />
        {formState.errors.root ? (
          <AppText variant="callout" color="danger" accessibilityLiveRegion="polite">
            {formState.errors.root.message}
          </AppText>
        ) : null}
        <Button
          label="Esqueci minha senha"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => router.push({ pathname: '/forgot-password', params: { email: getValues('email') } })}
        />
      </View>
    </Screen>
  );
}
