create table if not exists progress_photos (
  profile_id uuid primary key references profiles(id) on delete cascade,
  before_path text not null,
  before_uploaded_at timestamptz not null default now(),
  after_path text,
  after_uploaded_at timestamptz,
  storage_consent_at timestamptz not null,
  show_public boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint progress_photos_after_pair check (
    (after_path is null and after_uploaded_at is null)
    or (after_path is not null and after_uploaded_at is not null)
  ),
  constraint progress_photos_public_pair check (
    show_public = false or after_path is not null
  )
);

alter table progress_photos enable row level security;

revoke all on table progress_photos from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists progress_photos_public_read on storage.objects;
drop policy if exists progress_photos_anon_insert on storage.objects;
drop policy if exists progress_photos_anon_update on storage.objects;
drop policy if exists progress_photos_anon_delete on storage.objects;
