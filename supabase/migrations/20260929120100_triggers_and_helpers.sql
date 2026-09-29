-- =============================================================================
-- Funções auxiliares e triggers de integridade
-- =============================================================================

-- Espaço (casal) do usuário autenticado. `security definer` evita recursão de RLS.
create or replace function private.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cm.couple_id
  from public.couple_members cm
  where cm.user_id = auth.uid();
$$;

create or replace function private.is_member_of(p_couple_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.couple_members cm
    where cm.couple_id = p_couple_id and cm.user_id = p_user_id
  );
$$;

revoke all on function private.current_couple_id() from public;
revoke all on function private.is_member_of(uuid, uuid) from public;
grant execute on function private.current_couple_id() to authenticated, service_role;
grant execute on function private.is_member_of(uuid, uuid) to authenticated, service_role;

-- Operações internas (mover eventos entre espaços) ligam esta flag só na transação.
create or replace function private.is_internal_move()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('app.internal_move', true), '') = 'on';
$$;

grant execute on function private.is_internal_move() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- updated_at genérico
-- -----------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

create trigger notification_settings_touch before update on public.notification_settings
  for each row execute function private.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Linhas sincronizadas (events, special_dates): versão, autoria e timestamps são
-- sempre definidos pelo servidor. O cliente não consegue forjá-los.
-- -----------------------------------------------------------------------------
create or replace function private.handle_synced_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.version    := 1;
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  -- Ações de chave estrangeira (ex.: ON DELETE SET NULL ao excluir uma conta) rodam
  -- como triggers aninhados: aceitamos a alteração, só versionando a linha.
  if pg_trigger_depth() > 1 then
    new.version    := old.version + 1;
    new.updated_at := now();
    return new;
  end if;

  if new.couple_id is distinct from old.couple_id and not private.is_internal_move() then
    raise exception 'couple_id is immutable' using errcode = '42501';
  end if;

  new.id         := old.id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.version    := old.version + 1;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  return new;
end;
$$;

create trigger events_synced_row before insert or update on public.events
  for each row execute function private.handle_synced_row();

create trigger special_dates_synced_row before insert or update on public.special_dates
  for each row execute function private.handle_synced_row();

-- O responsável por um compromisso precisa ser membro do mesmo casal.
create or replace function private.validate_event_responsible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_scope = 'person'
     and not private.is_internal_move()
     and not private.is_member_of(new.couple_id, new.responsible_user_id) then
    raise exception 'responsible must belong to the couple' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger events_validate_responsible
  before insert or update of owner_scope, responsible_user_id, couple_id on public.events
  for each row execute function private.validate_event_responsible();

-- -----------------------------------------------------------------------------
-- No máximo 2 pessoas por espaço (único ponto a mudar para "agenda familiar").
-- -----------------------------------------------------------------------------
create or replace function private.enforce_couple_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- Bloqueia o casal para evitar que dois aceites simultâneos passem juntos.
  perform 1 from public.couples where id = new.couple_id for update;
  select count(*) into v_count from public.couple_members where couple_id = new.couple_id;
  if v_count >= 2 then
    raise exception 'couple_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger couple_members_capacity before insert on public.couple_members
  for each row execute function private.enforce_couple_capacity();

-- -----------------------------------------------------------------------------
-- Novo usuário: perfil, preferências e espaço próprio.
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name      text;
  v_terms     text;
  v_couple_id uuid;
begin
  v_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if v_name is null then
    v_name := split_part(coalesce(new.email, ''), '@', 1);
  end if;
  v_name := left(coalesce(nullif(v_name, ''), 'Você'), 40);

  v_terms := left(nullif(new.raw_user_meta_data ->> 'terms_version', ''), 20);

  insert into public.profiles (id, display_name, terms_version, terms_accepted_at)
  values (new.id, v_name, v_terms, case when v_terms is not null then now() end);

  insert into public.notification_settings (user_id) values (new.id);

  insert into public.couples (created_by) values (new.id) returning id into v_couple_id;
  insert into public.couple_members (couple_id, user_id) values (v_couple_id, new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
