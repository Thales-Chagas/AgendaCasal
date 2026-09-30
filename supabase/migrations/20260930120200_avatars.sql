-- =============================================================================
-- Foto de perfil (opcional).
--
-- * Bucket PRIVADO `avatars`: a foto só é vista por quem a enviou e pelo parceiro, via
--   URL assinada e temporária. Nunca fica pública na internet.
-- * Caminho: `<id do usuário>/<uuid>.jpg`. Só o próprio usuário grava ou apaga na sua pasta.
-- * JPEG de até 1 MB (o app recorta e reduz para 512×512 antes de enviar).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Vejo a minha foto e a do meu parceiro (mesmo casal). Ninguém mais.
create policy avatars_select_self_or_partner on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1
          from public.couple_members cm
         where cm.couple_id = (select private.current_couple_id())
           and cm.user_id::text = (storage.foldername(name))[1]
      )
    )
  );

-- Caminho da foto atual no perfil (sempre dentro da pasta do próprio usuário).
alter table public.profiles
  add column avatar_path text
  constraint profiles_avatar_path_own check (
    avatar_path is null
    or (
      split_part(avatar_path, '/', 1) = id::text
      and avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
    )
  );

grant update (avatar_path) on public.profiles to authenticated;
