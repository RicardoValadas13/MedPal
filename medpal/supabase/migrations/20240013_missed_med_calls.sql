-- ============================================================
-- MISSED MEDICATION PHONE CALLS (replaces the SMS alert)
-- ============================================================
-- One row per alert chain. The missed-med-checker creates it and
-- places the first Twilio call; the call-flow webhook escalates
-- through the family contacts and records the press-1 confirmation.
create table if not exists missed_med_calls (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles on delete cascade,
  intake_event_id  uuid references intake_events on delete set null,
  script           text not null,
  audio_path       text,
  attempt          int not null default 0,
  contact_name     text,
  contact_phone    text,
  twilio_call_sid  text,
  status           text not null default 'calling'
    check (status in ('calling', 'confirmed', 'delivered', 'exhausted', 'failed')),
  confirmed_at     timestamptz,
  created_at       timestamptz not null default now()
);

alter table missed_med_calls enable row level security;

-- Written only by Edge Functions (service role); patients may read
-- their own alert history.
create policy "Users can view own missed med calls"
  on missed_med_calls for select
  using (auth.uid() = user_id);

-- Public bucket for the generated call audio — Twilio's <Play> tag
-- fetches it over plain HTTPS. Clips contain only the alert sentence.
insert into storage.buckets (id, name, public)
values ('call-audio', 'call-audio', true)
on conflict (id) do nothing;
