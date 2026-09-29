-- =============================================================================
-- Row Level Security e privilégios
--
-- O Supabase concede privilégios amplos por padrão às tabelas de `public`.
-- Aqui tudo é revogado e concedido de forma explícita e mínima.
-- =============================================================================

revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;

alter table public.profiles              enable row level security;
alter table public.couples               enable row level security;
alter table public.couple_members        enable row level security;
alter table public.couple_invites        enable row level security;
alter table public.events                enable row level security;
alter table public.special_dates         enable row level security;
alter table public.notification_settings enable row level security;
alter table public.push_tokens           enable row level security;
alter table private.invite_attempts      enable row level security;

-- -----------------------------------------------------------------------------
-- profiles: vejo o meu e o do meu parceiro; edito só o meu (apenas colunas públicas).
-- -----------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (display_name, avatar_color) on public.profiles to authenticated;

create policy profiles_select_self_or_partner on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or private.is_member_of((select private.current_couple_id()), id)
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- couples / couple_members: somente leitura do próprio espaço. Escrita só via RPC.
-- -----------------------------------------------------------------------------
grant select on public.couples to authenticated;
grant select on public.couple_members to authenticated;

create policy couples_select_own on public.couples
  for select to authenticated
  using (id = (select private.current_couple_id()));

create policy couple_members_select_own_couple on public.couple_members
  for select to authenticated
  using (couple_id = (select private.current_couple_id()));

-- couple_invites: nenhum acesso direto (nem leitura). Tudo via RPC.

-- -----------------------------------------------------------------------------
-- events / special_dates: membros do casal leem e escrevem.
-- Não existe DELETE direto: a exclusão é lógica (deleted_at) para sincronizar.
-- -----------------------------------------------------------------------------
grant select, insert, update on public.events to authenticated;
grant select, insert, update on public.special_dates to authenticated;

create policy events_select_member on public.events
  for select to authenticated
  using (couple_id = (select private.current_couple_id()));

create policy events_insert_member on public.events
  for insert to authenticated
  with check (couple_id = (select private.current_couple_id()));

create policy events_update_member on public.events
  for update to authenticated
  using (couple_id = (select private.current_couple_id()))
  with check (couple_id = (select private.current_couple_id()));

create policy special_dates_select_member on public.special_dates
  for select to authenticated
  using (couple_id = (select private.current_couple_id()));

create policy special_dates_insert_member on public.special_dates
  for insert to authenticated
  with check (couple_id = (select private.current_couple_id()));

create policy special_dates_update_member on public.special_dates
  for update to authenticated
  using (couple_id = (select private.current_couple_id()))
  with check (couple_id = (select private.current_couple_id()));

-- -----------------------------------------------------------------------------
-- notification_settings / push_tokens: estritamente individuais.
-- -----------------------------------------------------------------------------
grant select, update on public.notification_settings to authenticated;

create policy notification_settings_self on public.notification_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.push_tokens to authenticated;

create policy push_tokens_self on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Realtime: sinal de mudança para o parceiro (respeita as políticas acima).
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.events;
    alter publication supabase_realtime add table public.special_dates;
    alter publication supabase_realtime add table public.couple_members;
    alter publication supabase_realtime add table public.couples;
  end if;
end;
$$;
