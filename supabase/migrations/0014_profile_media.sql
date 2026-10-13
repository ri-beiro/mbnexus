-- Profile photo + cover photo: a cover_url column alongside the existing
-- avatar_url, and a public storage bucket to hold both. Objects live under
-- `<profile id>/avatar.<ext>` and `<profile id>/cover.<ext>` so a simple
-- "first path segment == auth.uid()" check is enough to scope writes to the
-- owning profile; profiles_update_self (0005) already lets a user write
-- their own avatar_url/cover_url columns once the file is uploaded.

alter table public.profiles add column cover_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
