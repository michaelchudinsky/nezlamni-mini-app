create table if not exists reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  reminder_code text not null,
  event_day date not null,
  sent_at timestamptz not null default now(),
  constraint reminder_deliveries_code_check check (
    reminder_code in ('morning_start', 'water_and_movement', 'night_mode')
  )
);

create unique index if not exists reminder_deliveries_unique_profile_code_day
on reminder_deliveries (profile_id, reminder_code, event_day);

alter table reminder_deliveries enable row level security;

drop policy if exists reminder_deliveries_select_anon on reminder_deliveries;
drop policy if exists reminder_deliveries_insert_anon on reminder_deliveries;

create policy reminder_deliveries_select_anon
on reminder_deliveries
for select
to anon
using (true);

create policy reminder_deliveries_insert_anon
on reminder_deliveries
for insert
to anon
with check (true);
