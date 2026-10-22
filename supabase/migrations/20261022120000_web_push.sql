-- =============================================================================
-- Web Push (app instalado pelo navegador, principalmente iPhone)
--
-- No celular os lembretes são agendados no próprio aparelho. No navegador isso não existe:
-- o app envia a lista dos próximos lembretes (já calculada, com texto genérico salvo se a
-- pessoa autorizou detalhes) e o servidor manda cada um na hora, por Web Push.
-- =============================================================================

-- Inscrição de push de um navegador/aparelho (endpoint + chaves públicas do navegador).
create table public.web_push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  endpoint     text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh       text not null check (char_length(p256dh) between 80 and 100),
  auth         text not null check (char_length(auth) between 16 and 32),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index web_push_subscriptions_user_idx on public.web_push_subscriptions (user_id);

-- Próximos lembretes de quem usa o app web (substituídos a cada mudança na agenda).
create table public.scheduled_pushes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  reminder_key text not null check (char_length(reminder_key) <= 200),
  fire_at      timestamptz not null,
  title        text not null check (char_length(title) <= 160),
  body         text not null check (char_length(body) <= 300),
  href         text not null check (href ~ '^/' and char_length(href) <= 300),
  sent_at      timestamptz,
  unique (user_id, reminder_key)
);
create index scheduled_pushes_due_idx on public.scheduled_pushes (fire_at) where sent_at is null;

alter table public.web_push_subscriptions enable row level security;
alter table public.scheduled_pushes enable row level security;

-- Estritamente individuais: cada um vê e apaga só o que é seu. Gravação só pelas funções abaixo.
grant select, delete on public.web_push_subscriptions to authenticated;
grant select, delete on public.scheduled_pushes to authenticated;
create policy web_push_subscriptions_self on public.web_push_subscriptions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy scheduled_pushes_self on public.scheduled_pushes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Registro da inscrição (se o navegador trocar de conta, a inscrição passa para a conta atual).
-- -----------------------------------------------------------------------------
create or replace function public.register_web_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if p_endpoint is null or p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000
     or char_length(coalesce(p_p256dh, '')) not between 80 and 100
     or char_length(coalesce(p_auth, '')) not between 16 and 32 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  delete from public.web_push_subscriptions where endpoint = p_endpoint and user_id <> v_uid;
  insert into public.web_push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_uid, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, last_seen_at = now();
end;
$$;

create or replace function public.unregister_web_push(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  delete from public.web_push_subscriptions where endpoint = p_endpoint and user_id = v_uid;
end;
$$;

-- Troca TODOS os lembretes futuros ainda não enviados desta pessoa pela lista nova (máx. 60).
create or replace function public.replace_scheduled_pushes(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 60 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  delete from public.scheduled_pushes where user_id = v_uid and sent_at is null;
  insert into public.scheduled_pushes (user_id, reminder_key, fire_at, title, body, href)
  select v_uid, item ->> 'key', (item ->> 'fire_at')::timestamptz, item ->> 'title', item ->> 'body', item ->> 'href'
  from jsonb_array_elements(p_items) as item
  where (item ->> 'fire_at')::timestamptz > now()
    and (item ->> 'fire_at')::timestamptz < now() + interval '60 days'
  on conflict (user_id, reminder_key) do update
    set fire_at = excluded.fire_at, title = excluded.title, body = excluded.body, href = excluded.href,
        sent_at = null
    where public.scheduled_pushes.sent_at is null;
end;
$$;

revoke all on function public.register_web_push(text, text, text) from public, anon;
revoke all on function public.unregister_web_push(text) from public, anon;
revoke all on function public.replace_scheduled_pushes(jsonb) from public, anon;
grant execute on function public.register_web_push(text, text, text) to authenticated;
grant execute on function public.unregister_web_push(text) to authenticated;
grant execute on function public.replace_scheduled_pushes(jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Envio: a cada minuto, se houver lembrete vencido, chama a Edge Function `send-web-push`.
-- A URL e o segredo ficam no Vault (sem eles nada acontece, ex.: ambiente local):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-web-push', 'web_push_url');
--   select vault.create_secret('<segredo compartilhado>', 'web_push_secret');
-- -----------------------------------------------------------------------------
create or replace function private.dispatch_web_pushes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
  v_net    text;
begin
  if not exists (
    select 1 from public.scheduled_pushes
     where sent_at is null and fire_at <= now() and fire_at > now() - interval '1 hour'
  ) then
    return;
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net')
     or not exists (select 1 from pg_namespace where nspname = 'vault') then
    return;
  end if;

  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'web_push_url'$q$ into v_url;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'web_push_secret'$q$ into v_secret;
  if v_url is null or v_secret is null then
    return;
  end if;

  -- O esquema do pg_net (normalmente `net`) é lido na hora: ele não existe em todo ambiente.
  select extnamespace::regnamespace::text into v_net from pg_extension where extname = 'pg_net';
  execute format('select %s.http_post(url := $1, body := $2, headers := $3)', v_net)
  using v_url, '{}'::jsonb,
        jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret);
end;
$$;

-- Pega os lembretes vencidos e os marca como enviados de uma vez (nunca manda duas vezes).
-- Fica em `public` para a Edge Function chamar via API, mas só o papel de serviço executa.
create or replace function public.claim_due_web_pushes()
returns table (id uuid, user_id uuid, title text, body text, href text, reminder_key text)
language sql
security definer
set search_path = ''
as $$
  update public.scheduled_pushes p
     set sent_at = now()
   where p.id in (
     select s.id from public.scheduled_pushes s
      where s.sent_at is null and s.fire_at <= now() and s.fire_at > now() - interval '1 hour'
      order by s.fire_at
      limit 500
      for update skip locked)
  returning p.id, p.user_id, p.title, p.body, p.href, p.reminder_key;
$$;

revoke all on function private.dispatch_web_pushes() from public;
revoke all on function public.claim_due_web_pushes() from public, anon, authenticated;
grant execute on function public.claim_due_web_pushes() to service_role;
grant select, delete on public.web_push_subscriptions to service_role;
grant select, delete on public.scheduled_pushes to service_role;

-- Limpeza: lembretes enviados ou perdidos há mais de 2 dias.
create or replace function private.purge_old_web_pushes()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.scheduled_pushes
   where (sent_at is not null and sent_at < now() - interval '2 days')
      or (sent_at is null and fire_at < now() - interval '2 days');
$$;
revoke all on function private.purge_old_web_pushes() from public;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('dispatch-web-pushes', '* * * * *', 'select private.dispatch_web_pushes()');
    perform cron.schedule('purge-old-web-pushes', '41 3 * * *', 'select private.purge_old_web_pushes()');
  end if;
end;
$$;
