-- =============================================================================
-- Financeiro: contas fixas recorrentes (aluguel, internet, cartão...) com lembrete.
--
--   * "Do casal"  (owner_scope = 'couple'): os dois veem e editam.
--   * "Pessoal"   (owner_scope = 'person'): PRIVADA. Só quem criou vê, edita ou exclui;
--     o parceiro não recebe nem por sincronização nem por tempo real (RLS).
--
-- Sincroniza pelo mesmo motor da agenda (versão, exclusão lógica, delta por updated_at).
-- O tipo (casal/pessoal) e o dono são imutáveis: mudar de privado para compartilhado
-- deixaria cópias órfãs no aparelho do parceiro.
-- =============================================================================

create table public.bills (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples (id) on delete cascade,
  owner_scope     text not null default 'couple'
                  check (owner_scope in ('person', 'couple')),
  -- Contas pessoais somem junto com a conta de quem as criou.
  owner_user_id   uuid references auth.users (id) on delete cascade,
  title           text not null check (char_length(btrim(title)) between 1 and 80),
  category        text not null default 'other'
                  check (category in ('housing', 'utilities', 'internet', 'card', 'subscription',
                                      'health', 'education', 'transport', 'insurance', 'other')),
  -- Em centavos, para não ter erro de arredondamento. Opcional (ex.: conta de luz varia).
  amount_cents    integer check (amount_cents between 0 and 1000000000),
  frequency       text not null default 'monthly' check (frequency in ('monthly', 'yearly')),
  -- Primeiro vencimento; o dia (e o mês, se anual) se repetem a partir dele.
  first_due_date  date not null,
  reminder_days   integer[] not null default '{0,3}'
                  check (reminder_days <@ array[0, 1, 2, 3, 5, 7]),
  -- Vencimentos já pagos (YYYY-MM-DD de cada vencimento). Guardamos no máximo 5 anos.
  paid_periods    date[] not null default '{}' check (cardinality(paid_periods) <= 60),
  notes           text check (char_length(notes) <= 500),
  version         integer not null default 1,
  created_by      uuid references auth.users (id) on delete set null,
  updated_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint bills_scope_shape check (
    (owner_scope = 'couple' and owner_user_id is null)
    or (owner_scope = 'person' and owner_user_id is not null)
  )
);

comment on table public.bills is
  'Contas fixas recorrentes. As pessoais (owner_scope = person) são visíveis só para o dono.';

create index bills_couple_updated_idx on public.bills (couple_id, updated_at);
create index bills_owner_idx on public.bills (owner_user_id) where owner_user_id is not null;

create trigger bills_synced_row before insert or update on public.bills
  for each row execute function private.handle_synced_row();

-- Conta pessoal só pode ser criada para si mesmo; tipo e dono não mudam depois.
create or replace function private.validate_bill_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_internal_move() or pg_trigger_depth() > 1 then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.owner_scope = 'person' and new.owner_user_id is distinct from auth.uid() then
      raise exception 'bill owner must be the current user' using errcode = '42501';
    end if;
  elsif new.owner_scope is distinct from old.owner_scope
     or new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'bill owner is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger bills_validate_owner before insert or update on public.bills
  for each row execute function private.validate_bill_owner();

revoke all on function private.validate_bill_owner() from public;

-- -----------------------------------------------------------------------------
-- RLS: do casal → membros do casal; pessoal → só o dono.
-- Sem DELETE direto: exclusão lógica (deleted_at) para sincronizar.
-- -----------------------------------------------------------------------------
alter table public.bills enable row level security;

grant select, insert, update on public.bills to authenticated;

create policy bills_select_visible on public.bills
  for select to authenticated
  using (
    couple_id = (select private.current_couple_id())
    and (owner_scope = 'couple' or owner_user_id = (select auth.uid()))
  );

create policy bills_insert_visible on public.bills
  for insert to authenticated
  with check (
    couple_id = (select private.current_couple_id())
    and (owner_scope = 'couple' or owner_user_id = (select auth.uid()))
  );

create policy bills_update_visible on public.bills
  for update to authenticated
  using (
    couple_id = (select private.current_couple_id())
    and (owner_scope = 'couple' or owner_user_id = (select auth.uid()))
  )
  with check (
    couple_id = (select private.current_couple_id())
    and (owner_scope = 'couple' or owner_user_id = (select auth.uid()))
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.bills;
  end if;
end;
$$;

-- Preferência individual: lembrar das contas a pagar.
alter table public.notification_settings
  add column bill_reminders boolean not null default true;

-- -----------------------------------------------------------------------------
-- RPCs que movem, copiam, exportam ou limpam dados passam a incluir as contas.
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
      update public.bills set couple_id = v_invite.couple_id where couple_id = v_old_couple;
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

  -- Contas do casal: com p_keep_shared_copy eu levo uma cópia (sem os meses já pagos).
  if p_keep_shared_copy then
    insert into public.bills (
      couple_id, owner_scope, title, category, amount_cents, frequency, first_due_date,
      reminder_days, notes)
    select v_new_couple, 'couple', title, category, amount_cents, frequency, first_due_date,
           reminder_days, notes
      from public.bills
     where couple_id = v_old_couple and owner_scope = 'couple' and deleted_at is null;
  end if;

  -- Minhas contas pessoais são privadas (o parceiro nunca as viu): vão comigo.
  perform set_config('app.internal_move', 'on', true);
  update public.bills
     set couple_id = v_new_couple
   where couple_id = v_old_couple and owner_scope = 'person' and owner_user_id = v_uid;
  perform set_config('app.internal_move', 'off', true);

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
      from public.special_dates s where s.couple_id = v_couple and s.deleted_at is null), '[]'::jsonb),
    'bills', coalesce((
      select jsonb_agg(to_jsonb(b) - 'version' order by b.created_at)
      from public.bills b
      where b.couple_id = v_couple and b.deleted_at is null
        and (b.owner_scope = 'couple' or b.owner_user_id = v_uid)), '[]'::jsonb)
  );
end;
$$;

create or replace function private.purge_soft_deleted()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.events where deleted_at < now() - interval '30 days';
  delete from public.special_dates where deleted_at < now() - interval '30 days';
  delete from public.bills where deleted_at < now() - interval '30 days';
  delete from private.invite_attempts where attempted_at < now() - interval '7 days';
  delete from public.couple_invites
   where coalesce(used_at, revoked_at, expires_at) < now() - interval '30 days';
$$;
