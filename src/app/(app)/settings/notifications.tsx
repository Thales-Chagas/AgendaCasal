import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Linking, View } from 'react-native';

import { toAppError } from '@/core/errors/app-error';
import {
  AppText,
  Button,
  Card,
  ListRow,
  Screen,
  ScreenHeader,
  Skeleton,
  toast,
  useTheme,
} from '@/design-system';
import { Bell } from '@/design-system/icons';
import { useSession } from '@/features/auth/session-store';
import type { NotificationSettings } from '@/features/notifications/data/settings-repository';
import {
  getNotificationSettingsRepository,
  getPermissionState,
  notificationSettingsKey,
  registerPushToken,
  requestPermission,
  scheduleRescheduling,
} from '@/features/notifications/notification-service';

export default function NotificationsScreen() {
  const { spacing } = useTheme();
  const userId = useSession((s) => s.userId) ?? '';
  const queryClient = useQueryClient();
  const permission = useQuery({ queryKey: ['notification-permission'], queryFn: getPermissionState });
  const settings = useQuery({
    queryKey: notificationSettingsKey,
    queryFn: () => getNotificationSettingsRepository().get(),
  });

  const update = useMutation({
    mutationFn: (patch: Partial<NotificationSettings>) =>
      getNotificationSettingsRepository().update(userId, patch),
    onMutate: async (patch) => {
      const previous = queryClient.getQueryData<NotificationSettings>(notificationSettingsKey);
      if (previous) queryClient.setQueryData(notificationSettingsKey, { ...previous, ...patch });
      return { previous };
    },
    onError: (error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(notificationSettingsKey, context.previous);
      toast.error(toAppError(error).userMessage);
    },
    onSuccess: () => scheduleRescheduling(0),
  });

  const enable = async () => {
    const state = await requestPermission();
    await queryClient.invalidateQueries({ queryKey: ['notification-permission'] });
    if (state === 'granted') {
      toast.success('Notificações ativadas ✓');
      scheduleRescheduling(0);
      void registerPushToken();
    } else {
      void Linking.openSettings();
    }
  };

  const s = settings.data;
  const toggle = (key: keyof NotificationSettings) =>
    s ? { value: s[key], onChange: (value: boolean) => update.mutate({ [key]: value }) } : undefined;

  return (
    <Screen>
      <ScreenHeader title="Notificações" />

      {permission.data && permission.data !== 'granted' ? (
        <Card tone="primarySoft" style={{ marginBottom: spacing.xl }}>
          <View style={{ gap: spacing.md }}>
            <AppText variant="bodyStrong">As notificações estão desligadas</AppText>
            <AppText variant="callout" color="textSecondary">
              Ative para receber lembretes como “Jantar hoje às 20h” e saber quando seu parceiro adicionar
              algo.
            </AppText>
            <Button label="Ativar notificações" icon={Bell} size="md" onPress={enable} />
          </View>
        </Card>
      ) : null}

      {!s ? (
        <Skeleton height={200} radius={24} />
      ) : (
        <View style={{ gap: spacing.xl }}>
          <Card padded={false}>
            <View style={{ paddingHorizontal: spacing.lg }}>
              <ListRow
                title="Lembretes dos meus compromissos"
                subtitle='Inclui os "Nosso"'
                toggle={toggle('eventReminders')}
              />
              <ListRow
                title="Lembretes dos compromissos do parceiro"
                subtitle="Receber também os lembretes dele(a)"
                toggle={toggle('partnerEventReminders')}
              />
              <ListRow
                title="Datas especiais"
                subtitle="Aniversários e datas importantes"
                toggle={toggle('specialDateReminders')}
              />
              <ListRow
                title="Novo compromisso do parceiro"
                subtitle="Avisar quando algo for adicionado"
                toggle={toggle('partnerNewEvent')}
              />
            </View>
          </Card>

          <View style={{ gap: spacing.sm }}>
            <AppText variant="label" color="textSecondary">
              PRIVACIDADE
            </AppText>
            <Card padded={false}>
              <View style={{ paddingHorizontal: spacing.lg }}>
                <ListRow
                  title="Mostrar detalhes nos avisos"
                  subtitle="Exibe o nome do compromisso na tela de bloqueio"
                  toggle={toggle('showDetailsInPush')}
                />
              </View>
            </Card>
            <AppText variant="caption" color="textSecondary">
              Desligado, os avisos do parceiro dizem apenas “Você tem um novo compromisso compartilhado”. Os
              lembretes são criados no próprio celular.
            </AppText>
          </View>
        </View>
      )}
    </Screen>
  );
}
