create table if not exists push_subscriptions (
  user_id    uuid primary key,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists push_sent_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  schedule_id     uuid,
  scheduled_date  date not null,
  sent_at         timestamptz default now()
);

create unique index if not exists push_sent_log_unique
  on push_sent_log (user_id, schedule_id, scheduled_date);

alter table push_subscriptions disable row level security;
alter table push_sent_log disable row level security;
