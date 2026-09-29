import { router, useLocalSearchParams } from 'expo-router';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { toAppError } from '@/core/errors/app-error';
import { AppText, Button, Screen, TextField, useTheme } from '@/design-system';
import { Mail } from '@/design-system/icons';
import { getAuthRepository } from '@/features/auth/auth-service';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { emailSchema } from '@/features/auth/schemas';
import { useZodForm } from '@/shared/forms';

const schema = z.object({ email: emailSchema });

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { spacing } = useTheme();
  const { control, handleSubmit, formState, setError } = useZodForm(schema, {
    defaultValues: { email: params.email ?? '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await getAuthRepository().requestPasswordReset(email);
      router.push({ pathname: '/reset-password', params: { email } });
    } catch (error) {
      setError('root', { message: toAppError(error).userMessage });
    }
  });

  return (
    <Screen footer={<Button label="Enviar código" onPress={onSubmit} loading={formState.isSubmitting} />}>
      <AuthHeader
        title="Esqueceu a senha?"
        subtitle="Sem problema. Enviaremos um código para você criar uma nova senha."
      />
      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              label="E-mail da sua conta"
              icon={Mail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={onSubmit}
              error={fieldState.error?.message}
            />
          )}
        />
        {formState.errors.root ? (
          <AppText variant="callout" color="danger">
            {formState.errors.root.message}
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}
