// Envio de Web Push para todas as inscrições de um conjunto de pessoas (Deno, Edge Functions).
import { buildWebPushRequest, isGoneStatus, type VapidKeys, type WebPushSubscription } from './web-push.ts';

export type WebPushMessage = { userId: string; title: string; body: string; href: string; tag?: string };

/** Acesso às inscrições (supabase-js na notify-partner; REST direto na send-web-push). */
export type SubscriptionStore = {
  list: (userIds: string[]) => Promise<(WebPushSubscription & { user_id: string })[]>;
  remove: (endpoints: string[]) => Promise<void>;
};

/** API REST do banco com a chave de serviço (só no servidor), sem bibliotecas. */
export function serviceRest() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  return async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers, ...init.headers },
    });
    if (!response.ok) throw new Error(`REST ${response.status}`);
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  };
}

export function restSubscriptionStore(rest: ReturnType<typeof serviceRest>): SubscriptionStore {
  const list = (values: string[]) => `(${values.map((v) => `"${v.replace(/"/g, '')}"`).join(',')})`;
  return {
    list: (userIds) =>
      rest(`web_push_subscriptions?select=user_id,endpoint,p256dh,auth&user_id=in.${list(userIds)}`),
    remove: async (endpoints) => {
      await rest(`web_push_subscriptions?endpoint=in.${encodeURIComponent(list(endpoints))}`, {
        method: 'DELETE',
      });
    },
  };
}

export function vapidFromEnv(): VapidKeys | null {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:ajuda@duoday.com.br' };
}

/** Manda cada mensagem para os navegadores da pessoa; apaga inscrições que não existem mais. */
export async function sendWebPushes(
  store: SubscriptionStore,
  vapid: VapidKeys,
  messages: WebPushMessage[],
): Promise<{ sent: number; failed: number }> {
  if (messages.length === 0) return { sent: 0, failed: 0 };
  const subscriptions = await store.list([...new Set(messages.map((m) => m.userId))]);

  const gone: string[] = [];
  let sent = 0;
  let failed = 0;
  await Promise.all(
    messages.flatMap((message) =>
      subscriptions
        .filter((s) => s.user_id === message.userId)
        .map(async (subscription) => {
          try {
            const request = await buildWebPushRequest(
              subscription,
              { title: message.title, body: message.body, href: message.href, tag: message.tag },
              vapid,
              { topic: message.tag },
            );
            const response = await fetch(request.url, {
              method: 'POST',
              headers: request.headers,
              body: request.body,
            });
            if (response.ok) sent++;
            else {
              failed++;
              if (isGoneStatus(response.status)) gone.push(subscription.endpoint);
            }
            await response.body?.cancel();
          } catch {
            failed++;
          }
        }),
    ),
  );
  if (gone.length) await store.remove(gone);
  return { sent, failed };
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
