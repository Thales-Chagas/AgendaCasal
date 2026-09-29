import { z } from 'zod';

/**
 * Configuração pública do app. Somente valores PÚBLICOS por natureza entram aqui
 * (URL do projeto e chave publicável). Chaves secretas nunca vão para o app.
 */
const envSchema = z.object({
  supabaseUrl: z.url(),
  supabasePublishableKey: z.string().min(20),
});

export type AppEnv = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

/** `null` quando o app não foi configurado (a tela inicial explica o que falta). */
export const env: AppEnv | null = parsed.success ? parsed.data : null;

export const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
