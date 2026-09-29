-- =============================================================================
-- RPCs do vínculo do casal
--
-- Erros de negócio usam errcode P0001 com mensagem em snake_case estável
-- (ex.: 'invite_invalid'). O app traduz para textos amigáveis.
-- =============================================================================

-- Alfabeto sem caracteres ambíguos (sem 0/O, 1/I/L, U). São 30 símbolos, e 8 caracteres
-- dão cerca de 39 bits de entropia.
create or replace function private.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_code  text := '';
  v_bytes bytea;
  v_byte  integer;
begin
  while char_length(v_code) < 8 loop
    v_bytes := uuid_send(gen_random_uuid());
    for i in 0..15 loop
      -- Bytes 6 e 8 do UUIDv4 carregam versão e variante (bits fixos): ignorar.
      continue when i in (6, 8);
      v_byte := get_byte(v_bytes, i);
      -- Rejeição para não haver viés de módulo (240 = 8 * 30).
      continue when v_byte >= 240;
      v_code := v_code || substr(v_alphabet, (v_byte % 30) + 1, 1);
      exit when char_length(v_code) = 8;
    end loop;
  end loop;
  return v_code;
end;
$$;

-- Normaliza entrada do usuário ("abcd-2345 " → "ABCD2345") e calcula o hash.
create or replace function private.invite_code_hash(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    sha256(convert_to('nossa-agenda-invite:' || upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8')),
    'hex'
  );
$$;

create or replace function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  return v_uid;
end;
$$;

-- Limite: 10 tentativas erradas por hora por usuário.
create or replace function private.assert_invite_rate_limit(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from private.invite_attempts
    where user_id = p_user_id and not success and attempted_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;
end;
$$;

-- Busca um convite válido. Tentativas inválidas são registradas numa transação
-- autônoma lógica: a função retorna null em vez de lançar erro, para o registro
-- da tentativa não ser desfeito.
create or replace function private.find_valid_invite(p_user_id uuid, p_code text, p_lock boolean)
returns public.couple_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.couple_invites;
begin
  perform private.assert_invite_rate_limit(p_user_id);

  if p_lock then
    select * into v_invite from public.couple_invites
    where code_hash = private.invite_code_hash(p_code)
      and used_at is null and revoked_at is null and expires_at > now()
    for update;
  else
    select * into v_invite from public.couple_invites
    where code_hash = private.invite_code_hash(p_code)
      and used_at is null and revoked_at is null and expires_at > now();
  end if;

  if v_invite.id is null then
    insert into private.invite_attempts (user_id, success) values (p_user_id, false);
    return null;
  end if;

  return v_invite;
end;
$$;

-- -----------------------------------------------------------------------------
-- Criar convite: revoga convites anteriores do espaço e devolve o código em claro
-- (esta é a única vez que ele existe fora do aparelho de quem convidou).
-- -----------------------------------------------------------------------------
create or replace function public.create_couple_invite()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := private.require_user();
  v_couple_id uuid;
  v_code      text;
  v_expires   timestamptz := now() + interval '48 hours';
begin
  v_couple_id := private.current_couple_id();

  if (select count(*) from public.couple_members where couple_id = v_couple_id) >= 2 then
    raise exception 'already_paired' using errcode = 'P0001';
  end if;

  update public.couple_invites
     set revoked_at = now()
   where couple_id = v_couple_id and used_at is null and revoked_at is null;

  loop
    v_code := private.generate_invite_code();
    begin
      insert into public.couple_invites (couple_id, created_by, code_hash, expires_at)
      values (v_couple_id, v_uid, private.invite_code_hash(v_code), v_expires);
      exit;
    exception when unique_violation then
      -- Colisão improvável: gera outro código.
    end;
  end loop;

  return query select v_code, v_expires;
end;
$$;

-- Cancela o convite ativo (ex.: "Cancelar convite").
create or replace function public.revoke_couple_invites()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_user();
  update public.couple_invites
     set revoked_at = now()
   where couple_id = private.current_couple_id()
     and used_at is null and revoked_at is null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Pré-visualizar convite: "Ana convidou você". Não revela nada além do nome.
-- -----------------------------------------------------------------------------
create or replace function public.preview_invite(p_code text)
returns table (inviter_name text, expires_at timestamptz, my_event_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := private.require_user();
  v_invite public.couple_invites;
begin
  v_invite := private.find_valid_invite(v_uid, p_code, false);
  if v_invite.id is null then
    return;  -- conjunto vazio: o app mostra "convite inválido ou expirado"
  end if;

  if v_invite.couple_id = private.current_couple_id() then
    raise exception 'own_invite' using errcode = 'P0001';
  end if;

  return query
    select p.display_name,
           v_invite.expires_at,
           (select count(*)::integer from public.events e
             where e.couple_id = private.current_couple_id() and e.deleted_at is null)
      from public.profiles p
     where p.id = v_invite.created_by;
end;
$$;

-- -----------------------------------------------------------------------------
-- Aceitar convite.
--   p_bring_events = true  → os compromissos e datas do meu espaço vêm comigo.
--   p_bring_events = false → meu espaço antigo (e seu conteúdo) é apagado.
--                            O app pede confirmação explícita antes.
-- -----------------------------------------------------------------------------
create or replace function public.accept_invite(p_code text, p_bring_events boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := private.require_user();
  v_invite     public.couple_invites;
  v_old_couple uuid;
begin
  v_invite := private.find_valid_invite(v_uid, p_code, true);
  if v_invite.id is null then
    return null;  -- o app mostra "convite inválido ou expirado"
  end if;

  v_old_couple := private.current_couple_id();

  if v_invite.couple_id = v_old_couple then
    raise exception 'own_invite' using errcode = 'P0001';
  end if;

  if (select count(*) from public.couple_members where couple_id = v_old_couple) >= 2 then
    raise exception 'already_paired' using errcode = 'P0001';
  end if;

  -- Bloqueia o espaço de destino e confere se ainda há vaga.
  perform 1 from public.couples where id = v_invite.couple_id for update;
  if (select count(*) from public.couple_members where couple_id = v_invite.couple_id) >= 2 then
    raise exception 'couple_full' using errcode = 'P0001';
  end if;

  if v_old_couple is not null then
    if p_bring_events then
      perform set_config('app.internal_move', 'on', true);
      update public.events set couple_id = v_invite.couple_id where couple_id = v_old_couple;
      update public.special_dates set couple_id = v_invite.couple_id where couple_id = v_old_couple;
      perform set_config('app.internal_move', 'off', true);
    end if;
    -- Espaço individual antigo deixa de existir (cascade remove o vínculo e o que ficou).
    delete from public.couples where id = v_old_couple;
  end if;

  insert into public.couple_members (couple_id, user_id) values (v_invite.couple_id, v_uid);

  update public.couples set connected_at = now() where id = v_invite.couple_id;

  update public.couple_invites
     set used_at = now(), used_by = v_uid
   where id = v_invite.id;

  insert into private.invite_attempts (user_id, success) values (v_uid, true);

  return v_invite.couple_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Desfazer vínculo. Nada é apagado:
--   * compromissos só meus → vão comigo (os originais viram exclusão lógica para
--     o aparelho do parceiro saber que saíram);
--   * compromissos "Nosso" e datas especiais → continuam com o parceiro; com
--     p_keep_shared_copy eu levo uma cópia;
--   * compromissos só do parceiro → ficam com ele.
-- -----------------------------------------------------------------------------
create or replace function public.leave_couple(p_keep_shared_copy boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := private.require_user();
  v_old_couple uuid := private.current_couple_id();
  v_new_couple uuid;
begin
  if (select count(*) from public.couple_members where couple_id = v_old_couple) < 2 then
    raise exception 'not_paired' using errcode = 'P0001';
  end if;

  insert into public.couples (created_by) values (v_uid) returning id into v_new_couple;

  -- Troca de vínculo primeiro: as cópias abaixo precisam de mim como membro do novo espaço.
  delete from public.couple_members where couple_id = v_old_couple and user_id = v_uid;
  insert into public.couple_members (couple_id, user_id) values (v_new_couple, v_uid);

  -- Cópias ganham novos IDs; responsável e textos são preservados.
  insert into public.events (
    couple_id, title, description, location, all_day, starts_at, ends_at, start_date,
    end_date, timezone, category, priority, owner_scope, responsible_user_id,
    recurrence_rule, recurrence_exdates, reminder_minutes, show_countdown)
  select v_new_couple, title, description, location, all_day, starts_at, ends_at, start_date,
         end_date, timezone, category, priority, owner_scope, responsible_user_id,
         recurrence_rule, recurrence_exdates, reminder_minutes, show_countdown
    from public.events
   where couple_id = v_old_couple
     and deleted_at is null
     and (
       (owner_scope = 'person' and responsible_user_id = v_uid)
       or (p_keep_shared_copy and owner_scope = 'couple')
     );

  if p_keep_shared_copy then
    insert into public.special_dates (couple_id, title, kind, date, repeats_yearly, reminder_days)
    select v_new_couple, title, kind, date, repeats_yearly, reminder_days
      from public.special_dates
     where couple_id = v_old_couple and deleted_at is null;
  end if;

  -- Meus compromissos pessoais saem da agenda do parceiro (exclusão lógica).
  update public.events
     set deleted_at = now()
   where couple_id = v_old_couple
     and owner_scope = 'person' and responsible_user_id = v_uid
     and deleted_at is null;

  update public.couples set connected_at = null where id = v_old_couple;
  update public.couple_invites set revoked_at = now()
   where couple_id = v_old_couple and used_at is null and revoked_at is null;

  return v_new_couple;
end;
$$;

-- -----------------------------------------------------------------------------
-- LGPD: registrar aceite de nova versão dos termos.
-- -----------------------------------------------------------------------------
create or replace function public.accept_terms(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if p_version is null or char_length(p_version) not between 1 and 20 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  update public.profiles
     set terms_version = p_version, terms_accepted_at = now()
   where id = v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- LGPD: portabilidade. Exporta os dados da conta e da agenda em JSON.
-- (Notas privadas não estão no servidor e são exportadas pelo próprio aparelho.)
-- -----------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := private.require_user();
  v_couple uuid := private.current_couple_id();
begin
  return jsonb_build_object(
    'exported_at', now(),
    'account', (
      select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
      from auth.users u where u.id = v_uid),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'notification_settings', (select to_jsonb(n) from public.notification_settings n where n.user_id = v_uid),
    'couple', (select to_jsonb(c) - 'sync_epoch' from public.couples c where c.id = v_couple),
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) - 'version' order by e.created_at)
      from public.events e where e.couple_id = v_couple and e.deleted_at is null), '[]'::jsonb),
    'special_dates', coalesce((
      select jsonb_agg(to_jsonb(s) - 'version' order by s.date)
      from public.special_dates s where s.couple_id = v_couple and s.deleted_at is null), '[]'::jsonb)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- LGPD / App Store: excluir a própria conta.
--   * conectado: meus compromissos pessoais são removidos; os "Nosso" ficam com o parceiro;
--   * sozinho: o espaço inteiro é removido.
-- -----------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := private.require_user();
  v_couple  uuid := private.current_couple_id();
  v_members integer;
begin
  select count(*) into v_members from public.couple_members where couple_id = v_couple;

  if v_members >= 2 then
    -- O parceiro precisa ressincronizar do zero (linhas removidas não geram exclusão lógica).
    update public.couples
       set sync_epoch = sync_epoch + 1, connected_at = null
     where id = v_couple;
  else
    delete from public.couples where id = v_couple;
  end if;

  -- Cascata: perfil, vínculo, preferências, tokens, eventos em que sou responsável.
  delete from auth.users where id = v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- Limpeza de exclusões lógicas antigas (agendada via pg_cron).
-- -----------------------------------------------------------------------------
create or replace function private.purge_soft_deleted()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.events where deleted_at < now() - interval '30 days';
  delete from public.special_dates where deleted_at < now() - interval '30 days';
  delete from private.invite_attempts where attempted_at < now() - interval '7 days';
  delete from public.couple_invites
   where coalesce(used_at, revoked_at, expires_at) < now() - interval '30 days';
$$;

-- -----------------------------------------------------------------------------
-- Privilégios das funções
-- -----------------------------------------------------------------------------
revoke all on function private.generate_invite_code() from public;
revoke all on function private.invite_code_hash(text) from public;
revoke all on function private.require_user() from public;
revoke all on function private.assert_invite_rate_limit(uuid) from public;
revoke all on function private.find_valid_invite(uuid, text, boolean) from public;
revoke all on function private.purge_soft_deleted() from public;

revoke all on function public.create_couple_invite() from public, anon;
revoke all on function public.revoke_couple_invites() from public, anon;
revoke all on function public.preview_invite(text) from public, anon;
revoke all on function public.accept_invite(text, boolean) from public, anon;
revoke all on function public.leave_couple(boolean) from public, anon;
revoke all on function public.accept_terms(text) from public, anon;
revoke all on function public.export_my_data() from public, anon;
revoke all on function public.delete_my_account() from public, anon;

grant execute on function public.create_couple_invite() to authenticated;
grant execute on function public.revoke_couple_invites() to authenticated;
grant execute on function public.preview_invite(text) to authenticated;
grant execute on function public.accept_invite(text, boolean) to authenticated;
grant execute on function public.leave_couple(boolean) to authenticated;
grant execute on function public.accept_terms(text) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
