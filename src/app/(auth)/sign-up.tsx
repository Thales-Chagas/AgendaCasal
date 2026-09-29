import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { toAppError } from '@/core/errors/app-error';
import { AppText, Button, Screen, TextField, useTheme } from '@/design-system';
import { Check, Mail, User } from '@/design-system/icons';
import { getAuthRepository } from '@/features/auth/auth-service';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { signUpSchema } from '@/features/auth/schemas';
import { useZodForm } from '@/shared/forms';

export default function SignUpScreen() {
  const { colors, spacing, radius } = useTheme();
  const form = useZodForm(signUpSchema, {
    defaultValues: { name: '', email: '', password: '', acceptedTerms: false as unknown as true },
  });
  const { control, handleSubmit, formState, setError } = form;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await getAuthRepository().signUp(values);
      router.push({ pathname: '/confirm-email', params: { email: values.email } });
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === 'email_taken') setError('email', { message: appError.userMessage });
      else if (appError.code === 'weak_password') setError('password', { message: appError.userMessage });
      else setError('root', { message: appError.userMessage });
    }
  });

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button
            label="Criar conta"
            onPress={onSubmit}
            loading={formState.isSubmitting}
            testID="sign-up-submit"
          />
          <Button label="Já tenho uma conta" variant="ghost" onPress={() => router.replace('/sign-in')} />
        </View>
      }>
      <AuthHeader title="Criar sua conta" subtitle="Leva menos de um minuto. Cada pessoa tem a sua." />
      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label="Como podemos te chamar?"
              icon={User}
              placeholder="Seu nome ou apelido"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="givenName"
              returnKeyType="next"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
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
              placeholder="Mínimo de 8 caracteres"
              autoComplete="new-password"
              textContentType="newPassword"
              helper="Use letras e números."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field, fieldState }) => (
            <View style={{ gap: spacing.xs }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!field.value }}
                accessibilityLabel="Li e aceito os Termos de Uso e a Política de Privacidade"
                onPress={() => field.onChange(!field.value)}
                style={[styles.termsRow, { gap: spacing.md }]}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderRadius: radius.sm,
                      borderColor: fieldState.error
                        ? colors.danger
                        : field.value
                          ? colors.primary
                          : colors.borderStrong,
                      backgroundColor: field.value ? colors.primary : colors.surface,
                    },
                  ]}>
                  {field.value ? <Check size={16} color={colors.textOnPrimary} strokeWidth={3} /> : null}
                </View>
                <AppText variant="callout" color="textSecondary" style={styles.flex}>
                  Li e aceito os{' '}
                  <AppText variant="callout" color="primary" onPress={() => router.push('/legal/terms')}>
                    Termos de Uso
                  </AppText>{' '}
                  e a{' '}
                  <AppText variant="callout" color="primary" onPress={() => router.push('/legal/privacy')}>
                    Política de Privacidade
                  </AppText>
                  .
                </AppText>
              </Pressable>
              {fieldState.error ? (
                <AppText variant="caption" color="danger">
                  {fieldState.error.message}
                </AppText>
              ) : null}
            </View>
          )}
        />
        {formState.errors.root ? (
          <AppText variant="callout" color="danger" accessibilityLiveRegion="polite">
            {formState.errors.root.message}
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  termsRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  checkbox: { width: 26, height: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
