import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from '@/core/config/env';
import { AppError } from '@/core/errors/app-error';
import { secureStorage } from '@/core/storage/secure-storage';

import type { Database } from './database.types';

export type AppSupabaseClient = SupabaseClient<Database>;

let client: AppSupabaseClient | null = null;

/**
 * Cliente único do Supabase. Usa apenas a chave PUBLICÁVEL: toda autorização
 * acontece no banco (RLS). A sessão fica no Keychain/Keystore.
 */
export function getSupabase(): AppSupabaseClient {
  if (client) return client;
  if (!env) throw new AppError('not_configured');

  client = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: { headers: { 'x-client-info': `nossa-agenda/${Platform.OS}` } },
  });

  // Renova o token só com o app em primeiro plano (recomendação do Supabase para mobile).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }

  return client;
}
