// Edge Function (Deno): envia os lembretes vencidos de quem usa o app pelo navegador.
// Chamada a cada minuto pelo banco (pg_cron → pg_net), com o cabeçalho x-webhook-secret.
// O texto já foi preparado pelo app respeitando "Mostrar detalhes nos avisos".
import { createClient } from 'npm:@supabase/supabase-js@2';

import { sendWebPushes, timingSafeEqual, vapidFromEnv } from '../_shared/web-push-sender.ts';

type Due = { id: string; user_id: string; title: string; body: string; href: string; reminder_key: string };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const secret = Deno.env.get('WEB_PUSH_SECRET') ?? '';
  if (!secret || !timingSafeEqual(secret, req.headers.get('x-webhook-secret') ?? '')) {
    return new Response('unauthorized', { status: 401 });
  }
  const vapid = vapidFromEnv();
  if (!vapid) return new Response('web push not configured', { status: 503 });

  // Chave de serviço: existe só aqui no servidor, nunca no app.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data, error } = await admin.rpc('claim_due_web_pushes');
  if (error) return new Response('claim failed', { status: 500 });
  const due = (data ?? []) as Due[];

  const result = await sendWebPushes(
    admin,
    vapid,
    due.map((d) => ({ userId: d.user_id, title: d.title, body: d.body, href: d.href, tag: d.reminder_key })),
  );
  return Response.json({ due: due.length, ...result });
});
