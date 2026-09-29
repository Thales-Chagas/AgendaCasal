import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { toAppError } from '@/core/errors/app-error';
import { AppText, Button, CodeInput, Screen, TextField, toast, useTheme } from '@/design-system';
import { getAuthRepository } from '@/features/auth/auth-service';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { otpSchema, passwordSchema } from '@/features/auth/schemas';
import { useZodForm } from '@/shared/forms';

const schema = z
  .object({ code: otpSchema, password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não são iguais.' });

export default function ResetPasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { spacing } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState, setError } = useZodForm(schema, {
    defaultValues: { code: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ code, password }) => {
    setSubmitting(true);
    const auth = getAuthRepository();
    try {
      await auth.verifyRecoveryCode(email, code);
    } catch (error) {
      setError('code', { message: toAppError(error).userMessage });
      setSubmitting(false);
      return;
    }
    try {
      await auth.setNewPassword(password);
      toast.success('Senha alterada. Você já está dentro ❤️');
    } catch (error) {
      // O código foi aceito e a sessão já existe: a senha pode ser trocada depois pelo perfil.
      toast.error(toAppError(error).userMessage);
    }
  });

  return (
    <Screen footer={<Button label="Salvar nova senha" onPress={onSubmit} loading={submitting} />}>
      <AuthHeader
        title="Criar nova senha"
        subtitle={`Digite o código enviado para ${email} e a nova senha.`}
      />
      <View style={{ gap: spacing.xl }}>
        <Controller
          control={control}
          name="code"
          render={({ field, fieldState }) => (
            <CodeInput
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              autoFocus
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              label="Nova senha"
              password
              autoComplete="new-password"
              textContentType="newPassword"
              helper="Pelo menos 8 caracteres, com letras e números."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirm"
          render={({ field, fieldState }) => (
            <TextField
              label="Repita a nova senha"
              password
              autoComplete="new-password"
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
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
