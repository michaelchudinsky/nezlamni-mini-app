alter table profiles
  add column if not exists telegram_username text,
  add column if not exists show_telegram_contact boolean not null default false;
