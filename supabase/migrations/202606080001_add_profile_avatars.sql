alter table profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_anon_insert on storage.objects;
drop policy if exists avatars_anon_update on storage.objects;
drop policy if exists avatars_anon_delete on storage.objects;

create policy avatars_public_read
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy avatars_anon_insert
on storage.objects
for insert
to anon
with check (bucket_id = 'avatars');

create policy avatars_anon_update
on storage.objects
for update
to anon
using (bucket_id = 'avatars')
with check (bucket_id = 'avatars');

create policy avatars_anon_delete
on storage.objects
for delete
to anon
using (bucket_id = 'avatars');
