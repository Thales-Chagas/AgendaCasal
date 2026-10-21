-- Dados FICTÍCIOS para o vídeo (Supabase local). Casal: Bia e Rafa. Semana de 21/10/2026.
-- Rode depois de 01-casal.js / 01b-vinculo.js (as contas e o vínculo já precisam existir).
\set ON_ERROR_STOP on
begin;

create temp table ids as
select (select id from auth.users where email = 'bia@duoday.local') as bia,
       (select id from auth.users where email = 'rafa@duoday.local') as rafa,
       (select couple_id from public.couple_members m
          join auth.users u on u.id = m.user_id where u.email = 'bia@duoday.local') as couple;

-- Vencimentos de janeiro até o mês `upto` de 2026 já pagos (só os meses passados ficam em dia).
create or replace function pg_temp.private_months(day int, upto int) returns date[]
language sql as $$ select array_agg(make_date(2026, m, day) order by m) from generate_series(1, upto) m $$;

update public.profiles set avatar_color = 'teal' where id = (select rafa from ids);

insert into public.events
  (couple_id, title, location, category, priority, owner_scope, responsible_user_id,
   all_day, starts_at, ends_at, start_date, end_date, recurrence_rule, reminder_minutes,
   show_countdown, created_by)
select (select couple from ids), e.title, e.location, e.category, e.priority, e.scope,
       case e.who when 'bia' then (select bia from ids) when 'rafa' then (select rafa from ids) end,
       e.all_day, e.starts_at, e.ends_at, e.start_date, e.end_date, e.rrule, e.reminders,
       e.countdown, (select bia from ids)
from (values
  ('Pilates', 'Studio Movimento', 'health', 'normal', 'person', 'bia', false,
   '2026-10-21 18:00-03'::timestamptz, '2026-10-21 19:00-03'::timestamptz, null::date, null::date,
   'FREQ=WEEKLY;BYDAY=MO,WE', '{30}'::int[], false),
  ('Dentista', 'Clínica Sorriso', 'health', 'normal', 'person', 'rafa', false,
   '2026-10-21 17:30-03', '2026-10-21 18:15-03', null, null, null, '{60}', false),
  ('Reunião de planejamento', null, 'work', 'high', 'person', 'rafa', false,
   '2026-10-22 09:00-03', '2026-10-22 10:00-03', null, null, null, '{15}', false),
  ('Levar o Thor ao veterinário', 'Pet Vida', 'home', 'normal', 'couple', null, false,
   '2026-10-22 19:00-03', '2026-10-22 20:00-03', null, null, null, '{60}', false),
  ('Cinema 🍿', 'Shopping Center', 'event', 'normal', 'couple', null, false,
   '2026-10-23 21:00-03', '2026-10-23 23:30-03', null, null, null, '{120}', false),
  ('Aniversário da Lu', null, 'event', 'normal', 'couple', null, true,
   null, null, '2026-10-24', '2026-10-24', null, '{1440}', false),
  ('Feira', 'Praça da Matriz', 'home', 'low', 'couple', null, false,
   '2026-10-25 09:00-03', '2026-10-25 10:00-03', null, null, 'FREQ=WEEKLY;BYDAY=SU', '{}', false),
  ('Corrida no parque', null, 'health', 'normal', 'person', 'bia', false,
   '2026-10-26 07:00-03', '2026-10-26 08:00-03', null, null, null, '{}', false),
  ('Festa à fantasia 🎃', 'Casa do Pedro', 'event', 'normal', 'couple', null, false,
   '2026-10-31 21:00-03', '2026-11-01 02:00-03', null, null, null, '{1440}', true),
  ('Viagem para Paraty', 'Paraty, RJ', 'travel', 'high', 'couple', null, true,
   null, null, '2026-11-13', '2026-11-15', null, '{10080}', true)
) as e(title, location, category, priority, scope, who, all_day, starts_at, ends_at,
       start_date, end_date, rrule, reminders, countdown);

insert into public.special_dates (couple_id, title, kind, date, reminder_days, created_by)
select (select couple from ids), d.title, d.kind, d.date, d.reminders, (select bia from ids)
from (values
  ('Nosso aniversário de namoro', 'dating_anniversary', '2021-11-02'::date, '{0,1,7}'::int[]),
  ('Aniversário do Rafa', 'birthday', '1995-12-08', '{0,7}'),
  ('Aniversário da Bia', 'birthday', '1996-03-14', '{0,7}'),
  ('Dia em que nos conhecemos', 'important', '2021-06-19', '{0}')
) as d(title, kind, date, reminders);

-- Contas do casal.
insert into public.bills
  (couple_id, owner_scope, title, category, amount_cents, first_due_date, reminder_days,
   paid_periods, notes, created_by)
select (select couple from ids), 'couple', b.title, b.category, b.cents, b.first_due, b.reminders,
       b.paid, b.notes, (select bia from ids)
from (values
  ('Aluguel', 'housing', 235000, '2026-01-05'::date, '{0,3}'::int[],
   array['2026-01-05','2026-02-05','2026-03-05','2026-04-05','2026-05-05','2026-06-05',
         '2026-07-05','2026-08-05','2026-09-05','2026-10-05']::date[], null),
  ('Internet', 'internet', 11990, '2026-01-25', '{0,3}', pg_temp.private_months(25, 9), null),
  ('Luz', 'utilities', null, '2026-01-28', '{0,3}', pg_temp.private_months(28, 9), 'O valor muda todo mês'),
  ('Streaming', 'subscription', 5590, '2026-01-20', '{0}', pg_temp.private_months(20, 9), null)
) as b(title, category, cents, first_due, reminders, paid, notes);

-- Contas pessoais: o banco só aceita a conta criada pela própria pessoa (como no app).
select set_config('request.jwt.claims', json_build_object('sub', bia, 'role', 'authenticated')::text, true) from ids;
insert into public.bills
  (couple_id, owner_scope, owner_user_id, title, category, amount_cents, first_due_date,
   reminder_days, paid_periods, notes, created_by)
select couple, 'person', bia, 'Cartão da Bia', 'card', 128000, '2026-01-10', '{0,3}',
       pg_temp.private_months(10, 10), 'Pagar pelo app do banco', bia
from ids;

select set_config('request.jwt.claims', json_build_object('sub', rafa, 'role', 'authenticated')::text, true) from ids;
insert into public.bills
  (couple_id, owner_scope, owner_user_id, title, category, amount_cents, first_due_date,
   reminder_days, paid_periods, created_by)
select couple, 'person', rafa, 'Academia do Rafa', 'health', 9990, '2026-01-15', '{0}',
       pg_temp.private_months(15, 10), rafa
from ids;

commit;
