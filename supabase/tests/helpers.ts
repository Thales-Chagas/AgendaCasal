import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';

type LocalEnv = { apiUrl: string; publishableKey: string; secretKey: string; dbUrl: string };

let cachedEnv: LocalEnv | undefined;

/** Lê as credenciais do Supabase local (variáveis de ambiente ou `supabase status`). */
export function localEnv(): LocalEnv {
  if (cachedEnv) return cachedEnv;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SECRET_KEY) {
    cachedEnv = {
      apiUrl: process.env.SUPABASE_URL,
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
      secretKey: process.env.SUPABASE_SECRET_KEY,
      dbUrl: process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    };
    return cachedEnv;
  }
  const status = JSON.parse(
    execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
  );
  cachedEnv = {
    apiUrl: status.API_URL,
    publishableKey: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
    secretKey: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
    dbUrl: status.DB_URL,
  };
  return cachedEnv;
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

const openClients: SupabaseClient[] = [];

/** Fecha conexões de tempo real abertas pelos testes (chamado no afterAll global). */
export async function closeAllClients(): Promise<void> {
  await Promise.all(
    openClients.splice(0).map((c) => c.removeAllChannels().then(() => c.realtime.disconnect())),
  );
}

export function anonClient(): SupabaseClient {
  const env = localEnv();
  const client = createClient(env.apiUrl, env.publishableKey, clientOptions);
  openClients.push(client);
  return client;
}

export function adminClient(): SupabaseClient {
  const env = localEnv();
  const client = createClient(env.apiUrl, env.secretKey, clientOptions);
  openClients.push(client);
  return client;
}

export type TestUser = { id: string; email: string; password: string; name: string; client: SupabaseClient };

/** Cria um usuário confirmado e devolve um cliente autenticado como ele. */
export async function createUser(name: string): Promise<TestUser> {
  const email = `${name.toLowerCase()}-${randomUUID().slice(0, 8)}@teste.local`;
  const password = `Senha-${randomUUID()}`;
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name, terms_version: '2026-09' },
  });
  if (error || !data.user) throw error ?? new Error('createUser failed');

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { id: data.user.id, email, password, name, client };
}

export async function coupleIdOf(user: TestUser): Promise<string> {
  const { data, error } = await user.client
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .single();
  if (error) throw error;
  return data.couple_id as string;
}

/** Conecta dois usuários (a convida, b aceita trazendo os compromissos). */
export async function connect(a: TestUser, b: TestUser): Promise<string> {
  const { data: invite, error } = await a.client.rpc('create_couple_invite').single<{ code: string }>();
  if (error) throw error;
  const { data: coupleId, error: acceptError } = await b.client.rpc('accept_invite', {
    p_code: invite.code,
    p_bring_events: true,
  });
  if (acceptError) throw acceptError;
  if (!coupleId) throw new Error('invite rejected');
  return coupleId as string;
}

export function timedEvent(coupleId: string, overrides: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + 86_400_000);
  const end = new Date(start.getTime() + 3_600_000);
  return {
    id: randomUUID(),
    couple_id: coupleId,
    title: 'Jantar',
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    owner_scope: 'couple',
    ...overrides,
  };
}

export async function withDb<T>(fn: (db: PgClient) => Promise<T>): Promise<T> {
  const db = new PgClient({ connectionString: localEnv().dbUrl });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}
