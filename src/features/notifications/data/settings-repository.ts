import type { SupabaseClient } from '@supabase/supabase-js';

import { toAppError } from '@/core/errors/app-error';
import type { Database } from '@/core/supabase/database.types';

export type NotificationSettings = {
  eventReminders: boolean;
  partnerEventReminders: boolean;
  partnerNewEvent: boolean;
  specialDateReminders: boolean;
  showDetailsInPush: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  eventReminders: true,
  partnerEventReminders: false,
  partnerNewEvent: true,
  specialDateReminders: true,
  showDetailsInPush: false,
};

const columns = {
  eventReminders: 'event_reminders',
  partnerEventReminders: 'partner_event_reminders',
  partnerNewEvent: 'partner_new_event',
  specialDateReminders: 'special_date_reminders',
  showDetailsInPush: 'show_details_in_push',
} as const;

export function createNotificationSettingsRepository(client: SupabaseClient<Database>) {
  return {
    async get(): Promise<NotificationSettings> {
      const { data, error } = await client.from('notification_settings').select('*').maybeSingle();
      if (error) throw toAppError(error);
      if (!data) return DEFAULT_NOTIFICATION_SETTINGS;
      return {
        eventReminders: data.event_reminders,
        partnerEventReminders: data.partner_event_reminders,
        partnerNewEvent: data.partner_new_event,
        specialDateReminders: data.special_date_reminders,
        showDetailsInPush: data.show_details_in_push,
      };
    },
    async update(userId: string, patch: Partial<NotificationSettings>): Promise<void> {
      const row: Database['public']['Tables']['notification_settings']['Update'] = {};
      for (const [key, value] of Object.entries(patch) as [keyof NotificationSettings, boolean][]) {
        row[columns[key]] = value;
      }
      const { error } = await client.from('notification_settings').update(row).eq('user_id', userId);
      if (error) throw toAppError(error);
    },
    async registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
      const { error } = await client.rpc('register_push_token', { p_token: token, p_platform: platform });
      if (error) throw toAppError(error);
    },
    async unregisterPushToken(token: string): Promise<void> {
      const { error } = await client.rpc('unregister_push_token', { p_token: token });
      if (error) throw toAppError(error);
    },
  };
}
