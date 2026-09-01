alter table public.profiles
  add column if not exists active_legend_slug text;

alter table public.profiles
  add column if not exists legends_collection_complete boolean not null default false;

create table if not exists public.user_legends (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  legend_slug text not null,
  unlocked_at timestamptz not null default now(),
  popup_seen_at timestamptz,
  primary key (profile_id, legend_slug)
);

alter table public.user_legends enable row level security;
revoke all on table public.user_legends from anon, authenticated;

create index if not exists user_legends_profile_id_idx
  on public.user_legends(profile_id);

comment on table public.user_legends is
  'Unlocked collectible Legends. Access is limited to verified server routes.';
