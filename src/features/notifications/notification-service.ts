import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { logger } from '@/core/logging/logger';
import { queryClient } from '@/core/query/query-client';
import { secureStorage } from '@/core/storage/secure-storage';
import { getSupabase } from '@/core/supabase/client';
import { onSignOut } from '@/features/auth/auth-service';
import { getAgendaRuntime, onAgendaChanged } from '@/features/sync/agenda-runtime';

import {
  createNotificationSettingsRepository,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from './data/settings-repository';
import { planReminders } from './domain/planner';

const CHANNEL_ID = 'reminders';
const PUSH_TOKEN_KEY = 'push.token';
export const notificationSettingsKey = ['notification-settings'] as const;

let repository: ReturnType<typeof createNotificationSettingsRepository> | null = null;
export function getNotificationSettingsRepository() {
  repository ??= createNotificationSettingsRepository(getSupabase());
  return repository;
}

let configured = false;

/** Configuração única: exibição em primeiro plano, canal Android e toque na notificação. */
export function configureNotifications(): void {
  if (configured || Platform.OS === 'web') return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Lembretes',
      description: 'Lembretes de compromissos, datas especiais e contas',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#B8385A',
    });
  }

  Notifications.addNotificationResponseReceivedListener((response) => {
    const href = response.notification.request.content.data?.href;
    if (typeof href === 'string' && href.startsWith('/')) router.push(href as never);
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

/** Pede permissão só em contexto (ex.: depois de criar um lembrete), nunca na abertura. */
export async function requestPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.requestPermissionsAsync();
  return status as PermissionState;
}

async function currentSettings(): Promise<NotificationSettings> {
  try {
    return await queryClient.fetchQuery({
      queryKey: notificationSettingsKey,
      queryFn: () => getNotificationSettingsRepository().get(),
      staleTime: 5 * 60_000,
    });
  } catch {
    // Sem internet: usa o último valor conhecido ou o padrão.
    return (
      queryClient.getQueryData<NotificationSettings>(notificationSettingsKey) ?? DEFAULT_NOTIFICATION_SETTINGS
    );
  }
}

let rescheduling: ReturnType<typeof setTimeout> | null = null;

/** Reprograma os lembretes locais a partir da agenda no aparelho (agrupa chamadas). */
export function scheduleRescheduling(delayMs = 1500): void {
  if (Platform.OS === 'web') return;
  if (rescheduling) clearTimeout(rescheduling);
  rescheduling = setTimeout(() => void rescheduleReminders(), delayMs);
}

export async function rescheduleReminders(): Promise<void> {
  const runtime = getAgendaRuntime();
  if (!runtime || (await getPermissionState()) !== 'granted') return;
  try {
    const [events, specialDates, bills, settings] = await Promise.all([
      runtime.local.allActive('events'),
      runtime.local.allActive('special_dates'),
      runtime.local.allActive('bills'),
      currentSettings(),
    ]);
    const plan = planReminders({ events, specialDates, bills, viewerId: runtime.userId, settings });
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const reminder of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: reminder.title,
          body: reminder.body,
          data: { href: reminder.href },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.fireAt,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch (error) {
    logger.warn('Reminder rescheduling failed', { error });
  }
}

/** Registra este aparelho para receber avisos do parceiro (se houver permissão). */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web' || (await getPermissionState()) !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return; // sem projeto EAS configurado (desenvolvimento)
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await getNotificationSettingsRepository().registerPushToken(
      token,
      Platform.OS === 'ios' ? 'ios' : 'android',
    );
    await secureStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch (error) {
    logger.warn('Push token registration failed', { error });
  }
}

/**
 * Antes de sair da conta (sessão ainda válida): este aparelho deixa de receber
 * avisos da conta e os lembretes locais são apagados.
 */
export async function prepareSignOut(): Promise<void> {
  if (Platform.OS === 'web') return;
  const token = await secureStorage.getItem(PUSH_TOKEN_KEY).catch(() => null);
  if (token) {
    await getNotificationSettingsRepository()
      .unregisterPushToken(token)
      .catch((error) => logger.warn('Push token unregister failed', { error }));
    await secureStorage.removeItem(PUSH_TOKEN_KEY).catch(() => undefined);
  }
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}

// Garantia extra (ex.: sessão expirada): nenhum lembrete da conta anterior fica no aparelho.
onSignOut(async () => {
  if (Platform.OS !== 'web') await Notifications.cancelAllScheduledNotificationsAsync();
});

// Agenda mudou (edição local ou sincronização) → reprograma lembretes.
onAgendaChanged(() => scheduleRescheduling());
