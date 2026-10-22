// Envio de Web Push para todas as inscrições de um conjunto de pessoas (Deno, Edge Functions).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { buildWebPushRequest, isGoneStatus, type VapidKeys, type WebPushSubscription } from './web-push.ts';

export type WebPushMessage = { userId: string; title: string; body: string; href: string; tag?: string };

export function vapidFromEnv(): VapidKeys | null {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:ajuda@duoday.com.br' };
}

/** Manda cada mensagem para os navegadores da pessoa; apaga inscrições que não existem mais. */
export async function sendWebPushes(
  admin: SupabaseClient,
  vapid: VapidKeys,
  messages: WebPushMessage[],
): Promise<{ sent: number; failed: number }> {
  if (messages.length === 0) return { sent: 0, failed: 0 };
  const userIds = [...new Set(messages.map((m) => m.userId))];
  const { data } = await admin
    .from('web_push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  const subscriptions = (data ?? []) as (WebPushSubscription & { user_id: string })[];

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
  if (gone.length) await admin.from('web_push_subscriptions').delete().in('endpoint', gone);
  return { sent, failed };
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
