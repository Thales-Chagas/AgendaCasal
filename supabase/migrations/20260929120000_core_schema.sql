-- =============================================================================
-- Nossa Agenda: esquema principal
--
-- Princípios:
--   * Toda tabela tem RLS ativa e nega por padrão.
--   * O papel `anon` não tem acesso a nenhuma tabela.
--   * Tabelas de vínculo (couples, couple_members, couple_invites) não aceitam
--     escrita direta do app. Só funções RPC validadas as alteram (ver migration seguinte).
--   * Funções auxiliares ficam no schema `private`, que não é exposto pela API.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Perfis
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text not null
                    check (char_length(btrim(display_name)) between 1 and 40),
  avatar_color      text not null default 'rose'
                    check (avatar_color in ('rose', 'plum', 'indigo', 'teal', 'amber', 'sage')),
  terms_version     text check (char_length(terms_version) <= 20),
  terms_accepted_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.profiles is 'Dados públicos mínimos de cada pessoa (visíveis só para ela e o parceiro).';

-- -----------------------------------------------------------------------------
-- Espaço do casal
-- Todo usuário pertence a exatamente um espaço desde o cadastro. Um espaço com um
-- único membro é a agenda de quem ainda não conectou o parceiro.
-- -----------------------------------------------------------------------------
create table public.couples (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid references auth.users (id) on delete set null,
  connected_at timestamptz,
  -- Incrementado quando o app precisa descartar a cópia local e sincronizar do zero.
  sync_epoch   integer not null default 1,
  created_at   timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  -- Uma pessoa participa de um único espaço.
  constraint couple_members_one_space_per_user unique (user_id)
);

create table public.couple_invites (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  -- O código nunca é salvo em claro, apenas o hash SHA-256.
  code_hash  text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  used_by    uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index couple_invites_couple_idx on public.couple_invites (couple_id);

-- Tentativas de uso de convite (proteção contra força bruta). Não exposta pela API.
create table private.invite_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  success      boolean not null,
  attempted_at timestamptz not null default now()
);

create index invite_attempts_user_time_idx on private.invite_attempts (user_id, attempted_at desc);

-- -----------------------------------------------------------------------------
-- Compromissos
-- -----------------------------------------------------------------------------
create table public.events (
  id                  uuid primary key default gen_random_uuid(),
  couple_id           uuid not null references public.couples (id) on delete cascade,
  title               text not null check (char_length(btrim(title)) between 1 and 120),
  description         text check (char_length(description) <= 2000),
  location            text check (char_length(location) <= 200),
  all_day             boolean not null default false,
  starts_at           timestamptz,
  ends_at             timestamptz,
  start_date          date,
  end_date            date,
  timezone            text not null default 'America/Sao_Paulo'
                      check (char_length(timezone) between 1 and 64),
  category            text not null default 'couple'
                      check (category in ('couple', 'work', 'health', 'finance', 'travel',
                                          'event', 'home', 'other')),
  priority            text not null default 'normal'
                      check (priority in ('low', 'normal', 'high')),
  owner_scope         text not null default 'couple'
                      check (owner_scope in ('person', 'couple')),
  responsible_user_id uuid references auth.users (id) on delete cascade,
  recurrence_rule     text check (char_length(recurrence_rule) <= 500),
  recurrence_exdates  date[] not null default '{}'
                      check (cardinality(recurrence_exdates) <= 500),
  reminder_minutes    integer[] not null default '{}'
                      check (cardinality(reminder_minutes) <= 5
                             and 0 <= all (reminder_minutes)
                             and 40320 >= all (reminder_minutes)),
  show_countdown      boolean not null default false,
  version             integer not null default 1,
  created_by          uuid references auth.users (id) on delete set null,
  updated_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,

  -- Dia inteiro usa `date` (sem fuso); com horário usa `timestamptz`.
  constraint events_time_shape check (
    (all_day
      and start_date is not null and end_date is not null and end_date >= start_date
      and starts_at is null and ends_at is null)
    or
    (not all_day
      and starts_at is not null and ends_at is not null and ends_at >= starts_at
      and start_date is null and end_date is null)
  ),
  constraint events_max_duration check (
    (all_day and end_date - start_date <= 366)
    or (not all_day and ends_at - starts_at <= interval '366 days')
  ),
  -- "Nosso" não tem responsável individual; "Meu"/"Do parceiro" têm.
  constraint events_scope_shape check (
    (owner_scope = 'couple' and responsible_user_id is null)
    or (owner_scope = 'person' and responsible_user_id is not null)
  )
);

create index events_couple_updated_idx on public.events (couple_id, updated_at);
create index events_couple_starts_idx on public.events (couple_id, starts_at) where deleted_at is null;
create index events_couple_start_date_idx on public.events (couple_id, start_date) where deleted_at is null;
create index events_responsible_idx on public.events (responsible_user_id);

-- -----------------------------------------------------------------------------
-- Datas especiais
-- -----------------------------------------------------------------------------
create table public.special_dates (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  title          text not null check (char_length(btrim(title)) between 1 and 80),
  kind           text not null default 'custom'
                 check (kind in ('birthday', 'dating_anniversary', 'wedding_anniversary',
                                 'first_trip', 'important', 'custom')),
  date           date not null,
  repeats_yearly boolean not null default true,
  reminder_days  integer[] not null default '{0,1}'
                 check (reminder_days <@ array[0, 1, 3, 7]),
  version        integer not null default 1,
  created_by     uuid references auth.users (id) on delete set null,
  updated_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create index special_dates_couple_updated_idx on public.special_dates (couple_id, updated_at);

-- -----------------------------------------------------------------------------
-- Preferências de notificação e tokens de push (sempre individuais)
-- -----------------------------------------------------------------------------
create table public.notification_settings (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  event_reminders         boolean not null default true,
  partner_event_reminders boolean not null default false,
  partner_new_event       boolean not null default true,
  special_date_reminders  boolean not null default true,
  -- Por padrão o push é genérico: o conteúdo passa pelos servidores Apple/Google.
  show_details_in_push    boolean not null default false,
  updated_at              timestamptz not null default now()
);

create table public.push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  token        text not null unique check (char_length(token) <= 256),
  platform     text not null check (platform in ('ios', 'android')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);
