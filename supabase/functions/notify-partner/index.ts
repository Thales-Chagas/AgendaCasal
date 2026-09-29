// Edge Function (Deno): avisa o parceiro quando um compromisso novo é criado.
// Chamada apenas pelo gatilho do banco (cabeçalho x-webhook-secret).
// Privacidade: por padrão o texto é genérico; detalhes só com consentimento
// (notification_settings.show_details_in_push).
import { createClient } from 'npm:@supabase/supabase-js@2';

type Payload = { event_id: string; couple_id: string; author_id: string | null };

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const secret = Deno.env.get('NOTIFY_PARTNER_SECRET') ?? '';
  const provided = req.headers.get('x-webhook-secret') ?? '';
  if (!secret || !timingSafeEqual(secret, provided)) return new Response('unauthorized', { status: 401 });

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return new Response('bad request', { status: 400 });
  }
  if (!payload.event_id || !payload.couple_id) return new Response('bad request', { status: 400 });

  // Chave de serviço: existe só aqui no servidor, nunca no app.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: event } = await admin
    .from('events')
    .select('id, title, couple_id, created_by, deleted_at')
    .eq('id', payload.event_id)
    .maybeSingle();
  if (!event || event.deleted_at || event.couple_id !== payload.couple_id) return new Response('ignored');

  const { data: members } = await admin
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', event.couple_id);
  const partnerIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== event.created_by);
  if (partnerIds.length === 0) return new Response('no partner');

  const [{ data: settings }, { data: tokens }, { data: author }] = await Promise.all([
    admin
      .from('notification_settings')
      .select('user_id, partner_new_event, show_details_in_push')
      .in('user_id', partnerIds),
    admin.from('push_tokens').select('user_id, token').in('user_id', partnerIds),
    admin
      .from('profiles')
      .select('display_name')
      .eq('id', event.created_by ?? '')
      .maybeSingle(),
  ]);

  const messages = (tokens ?? []).flatMap((t) => {
    const pref = settings?.find((s) => s.user_id === t.user_id);
    if (pref && !pref.partner_new_event) return [];
    const details = pref?.show_details_in_push === true;
    return [
      {
        to: t.token,
        sound: 'default',
        title: 'Nova atualização na agenda ❤️',
        body: details
          ? `${author?.display_name ?? 'Seu parceiro'} adicionou: ${event.title}`
          : 'Você tem um novo compromisso compartilhado.',
        data: { href: `/event/${event.id}` },
      },
    ];
  });

  if (messages.length === 0) return new Response('nothing to send');

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  // Tokens inválidos (app desinstalado) são removidos.
  if (response.ok) {
    const result = (await response.json()) as { data?: { status: string; details?: { error?: string } }[] };
    const invalid = (result.data ?? [])
      .map((r, i) => (r.details?.error === 'DeviceNotRegistered' ? messages[i]?.to : null))
      .filter((token): token is string => !!token);
    if (invalid.length) await admin.from('push_tokens').delete().in('token', invalid);
  }

  return new Response('ok');
});
