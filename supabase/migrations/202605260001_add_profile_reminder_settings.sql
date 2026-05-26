alter table profiles
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists reminder_morning_enabled boolean not null default true,
  add column if not exists reminder_water_enabled boolean not null default true,
  add column if not exists reminder_activity_enabled boolean not null default true,
  add column if not exists reminder_sleep_enabled boolean not null default true,
  add column if not exists timezone text not null default 'Europe/Kyiv';
