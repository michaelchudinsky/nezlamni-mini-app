create table if not exists profile_supports (
  id uuid primary key default gen_random_uuid(),
  target_profile_id uuid not null references profiles(id) on delete cascade,
  supporter_profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_supports_no_self_support check (
    target_profile_id <> supporter_profile_id
  )
);

create unique index if not exists profile_supports_unique_pair
on profile_supports (target_profile_id, supporter_profile_id);

alter table profile_supports enable row level security;

drop policy if exists profile_supports_select_anon on profile_supports;
drop policy if exists profile_supports_insert_anon on profile_supports;
drop policy if exists profile_supports_delete_anon on profile_supports;

create policy profile_supports_select_anon
on profile_supports
for select
to anon
using (true);

create policy profile_supports_insert_anon
on profile_supports
for insert
to anon
with check (target_profile_id <> supporter_profile_id);

create policy profile_supports_delete_anon
on profile_supports
for delete
to anon
using (true);
