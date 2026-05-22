create table if not exists feedback_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  message text not null,
  screen text not null default 'home',
  created_at timestamptz not null default now(),
  constraint feedback_messages_message_length check (
    char_length(trim(message)) between 3 and 1000
  )
);

alter table feedback_messages enable row level security;

drop policy if exists feedback_messages_insert_anon on feedback_messages;

create policy feedback_messages_insert_anon
on feedback_messages
for insert
to anon
with check (char_length(trim(message)) between 3 and 1000);
