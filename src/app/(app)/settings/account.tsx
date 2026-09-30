import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { toAppError } from '@/core/errors/app-error';
import {
  AppText,
  Avatar,
  BottomSheet,
  Button,
  Card,
  ListRow,
  PERSONAL_COLORS,
  Screen,
  ScreenHeader,
  TextField,
  toast,
  useTheme,
  type AvatarColor,
} from '@/design-system';
import { Check, KeyRound, Mail, Trash } from '@/design-system/icons';
import { deleteAccount } from '@/features/account/account-actions';
import { getAuthRepository } from '@/features/auth/auth-service';
import { changePasswordSchema, displayNameSchema } from '@/features/auth/schemas';
import { useSession } from '@/features/auth/session-store';
import { usePeople, useUpdateProfile } from '@/features/couple/hooks';
import { resolvePersonalColor } from '@/features/events/domain/person-color';
import { useZodForm } from '@/shared/forms';

const COLOR_NAMES: Record<AvatarColor, string> = {
  rose: 'Rosa',
  plum: 'Ameixa',
  indigo: 'Índigo',
  teal: 'Verde-azulado',
  amber: 'Âmbar',
  sage: 'Sálvia',
};

export default function AccountScreen() {
  const { spacing, colors } = useTheme();
  const email = useSession((s) => s.email) ?? '';
  const userId = useSession((s) => s.userId) ?? '';
  const { me } = usePeople();
  const myColor = resolvePersonalColor(me?.avatarColor, 'indigo');
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(me?.displayName ?? '');
  const [nameError, setNameError] = useState<string>();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const saveName = () => {
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message);
      return;
    }
    setNameError(undefined);
    updateProfile.mutate(
      { displayName: parsed.data },
      {
        onSuccess: () => toast.success('Nome atualizado ✓'),
        onError: (e) => toast.error(toAppError(e).userMessage),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Minha conta" />
      <View style={{ gap: spacing.xl }}>
        <View style={{ alignItems: 'center' }}>
          <Avatar name={name || me?.displayName || ''} color={myColor} size={88} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <TextField
            label="Como podemos te chamar?"
            value={name}
            onChangeText={setName}
            error={nameError}
            maxLength={40}
            helper="É o nome que seu parceiro vê."
          />
          {name.trim() !== me?.displayName ? (
            <Button label="Salvar nome" size="md" onPress={saveName} loading={updateProfile.isPending} />
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textSecondary">
            SUA COR
          </AppText>
          <AppText variant="caption" color="textSecondary">
            Aparece no seu avatar e nos seus compromissos. O rosa é reservado para o que é do casal.
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
            {PERSONAL_COLORS.map((color) => (
              <Pressable
                key={color}
                accessibilityRole="radio"
                accessibilityState={{ selected: myColor === color }}
                accessibilityLabel={COLOR_NAMES[color]}
                onPress={() => updateProfile.mutate({ avatarColor: color })}>
                <View>
                  <Avatar name={name || '·'} color={color} size={48} />
                  {myColor === color ? (
                    <View
                      style={{
                        position: 'absolute',
                        right: -2,
                        bottom: -2,
                        backgroundColor: colors.primary,
                        borderRadius: 10,
                        padding: 2,
                      }}>
                      <Check size={14} color={colors.textOnPrimary} strokeWidth={3} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.lg }}>
            <ListRow icon={Mail} title="E-mail" subtitle={email} />
            <ListRow icon={KeyRound} title="Alterar senha" onPress={() => setPasswordOpen(true)} />
            <ListRow
              icon={Trash}
              title="Excluir minha conta"
              destructive
              onPress={() => setDeleteOpen(true)}
            />
          </View>
        </Card>
      </View>

      <ChangePasswordSheet visible={passwordOpen} email={email} onClose={() => setPasswordOpen(false)} />
      <DeleteAccountSheet
        visible={deleteOpen}
        email={email}
        userId={userId}
        onClose={() => setDeleteOpen(false)}
      />
    </Screen>
  );
}

function ChangePasswordSheet({
  visible,
  email,
  onClose,
}: {
  visible: boolean;
  email: string;
  onClose: () => void;
}) {
  const { spacing } = useTheme();
  const { control, handleSubmit, formState, setError, reset } = useZodForm(changePasswordSchema, {
    defaultValues: { current: '', password: '', confirm: '' },
  });

  const submit = handleSubmit(async ({ current, password }) => {
    try {
      await getAuthRepository().changePassword(email, current, password);
      toast.success('Senha alterada ✓');
      reset();
      onClose();
    } catch (error) {
      const appError = toAppError(error);
      setError(appError.code === 'invalid_credentials' ? 'current' : 'password', {
        message: appError.userMessage,
      });
    }
  });

  const fields = [
    { name: 'current', label: 'Senha atual', autoComplete: 'current-password' },
    { name: 'password', label: 'Nova senha', autoComplete: 'new-password' },
    { name: 'confirm', label: 'Repita a nova senha', autoComplete: 'new-password' },
  ] as const;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Alterar senha">
      <View style={{ gap: spacing.md }}>
        {fields.map((f) => (
          <Controller
            key={f.name}
            control={control}
            name={f.name}
            render={({ field, fieldState }) => (
              <TextField
                label={f.label}
                password
                autoComplete={f.autoComplete}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        ))}
        <Button label="Salvar nova senha" onPress={submit} loading={formState.isSubmitting} />
      </View>
    </BottomSheet>
  );
}

function DeleteAccountSheet({
  visible,
  email,
  userId,
  onClose,
}: {
  visible: boolean;
  email: string;
  userId: string;
  onClose: () => void;
}) {
  const { spacing } = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    if (!password) {
      setError('Digite sua senha para confirmar.');
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(email, password, userId);
      toast.info('Sua conta foi excluída. Sentiremos sua falta ❤️');
    } catch (e) {
      setError(toAppError(e).userMessage);
      setDeleting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Excluir minha conta">
      <View style={{ gap: spacing.md }}>
        <AppText variant="body" color="textSecondary">
          Isto não pode ser desfeito. Serão apagados: sua conta, seus compromissos pessoais e as notas deste
          celular. Os compromissos “Nosso” continuam na agenda do seu parceiro.
        </AppText>
        <TextField
          label="Digite sua senha para confirmar"
          password
          value={password}
          onChangeText={setPassword}
          error={error}
          autoComplete="current-password"
        />
        <Button label="Excluir definitivamente" variant="danger" onPress={confirm} loading={deleting} />
        <Button label="Cancelar" variant="ghost" onPress={onClose} disabled={deleting} />
      </View>
    </BottomSheet>
  );
}
