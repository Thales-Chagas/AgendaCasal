-- =============================================================================
-- Push: registro seguro de tokens e aviso ao parceiro sobre novos compromissos
-- =============================================================================

-- Um token pertence a um único usuário. Se o aparelho trocar de conta, o token
-- migra para a conta atual (sem expor linhas de outros usuários).
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if p_token is null or char_length(p_token) not between 10 and 256 or p_platform not in ('ios', 'android') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  delete from public.push_tokens where token = p_token and user_id <> v_uid;
  insert into public.push_tokens (user_id, token, platform)
  values (v_uid, p_token, p_platform)
  on conflict (token) do update set last_seen_at = now(), platform = excluded.platform;
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  delete from public.push_tokens where token = p_token and user_id = v_uid;
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Novo compromisso → Edge Function `notify-partner` (via pg_net).
-- A URL e o segredo ficam no Vault; sem eles o gatilho não faz nada (ambiente local).
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/notify-partner', 'notify_partner_url');
--   select vault.create_secret('<segredo compartilhado>', 'notify_partner_secret');
-- -----------------------------------------------------------------------------
create or replace function private.notify_partner_new_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net')
     or not exists (select 1 from pg_namespace where nspname = 'vault') then
    return new;
  end if;

  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'notify_partner_url'$q$ into v_url;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'notify_partner_secret'$q$ into v_secret;
  if v_url is null or v_secret is null then
    return new;
  end if;

  -- Só identificadores: a função busca o resto respeitando as preferências do parceiro.
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
  using v_url,
        jsonb_build_object('event_id', new.id, 'couple_id', new.couple_id, 'author_id', new.created_by),
        jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret);
  return new;
exception when others then
  -- Notificação nunca pode impedir a gravação do compromisso.
  return new;
end;
$$;

create trigger events_notify_partner
  after insert on public.events
  for each row execute function private.notify_partner_new_event();
