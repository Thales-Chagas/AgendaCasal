-- =============================================================================
-- Privilégios explícitos para o papel de serviço (usado só pela Edge Function
-- notify-partner, no servidor). Não depende da opção "Automatically expose new
-- tables" do painel do Supabase, que recomendamos deixar DESLIGADA.
-- =============================================================================

grant usage on schema public to service_role;
grant select on public.events, public.couple_members, public.profiles, public.notification_settings
  to service_role;
grant select, delete on public.push_tokens to service_role;
