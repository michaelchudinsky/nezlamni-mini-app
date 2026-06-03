create table if not exists reminder_cron_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_path text not null,
  mode text not null,
  reminder_code text,
  status text not null,
  sent_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  diagnostics jsonb not null default '[]'::jsonb,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now(),
  constraint reminder_cron_runs_mode_check check (mode in ('hourly', 'forced')),
  constraint reminder_cron_runs_status_check check (
    status in ('success', 'partial_failure', 'failure')
  ),
  constraint reminder_cron_runs_code_check check (
    reminder_code is null
    or reminder_code in ('morning_start', 'water_and_movement', 'night_mode')
  )
);

create index if not exists reminder_cron_runs_created_at_idx
on reminder_cron_runs (created_at desc);

create index if not exists reminder_cron_runs_reminder_code_idx
on reminder_cron_runs (reminder_code, created_at desc);

alter table reminder_cron_runs enable row level security;

drop policy if exists reminder_cron_runs_insert_anon on reminder_cron_runs;

create policy reminder_cron_runs_insert_anon
on reminder_cron_runs
for insert
to anon
with check (true);
