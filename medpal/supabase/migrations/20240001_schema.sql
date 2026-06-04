-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  full_name    text,
  birth_date   date,
  sns_number   text, -- sensitive: GDPR special category
  timezone     text not null default 'Europe/Lisbon',
  locale       text not null default 'pt-PT',
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can manage own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- DRUGS (shared reference, read-only for users)
-- ============================================================
create table if not exists drugs (
  id              uuid primary key default uuid_generate_v4(),
  aim_number      text,
  cnpem_code      text,
  name            text not null,
  active_substance text,
  strength        text,
  form            text,
  route           text,
  atc_code        text,
  leaflet_url     text,
  rcm_url         text,
  is_marketed     boolean not null default true,
  last_synced_at  timestamptz,
  -- trigram index support
  name_tsv        tsvector generated always as (to_tsvector('portuguese', name)) stored
);

create index if not exists drugs_name_trgm on drugs using gin (name gin_trgm_ops);
create index if not exists drugs_name_tsv on drugs using gin (name_tsv);

alter table drugs enable row level security;

create policy "Anyone authenticated can read drugs"
  on drugs for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
create table if not exists prescriptions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles on delete cascade,
  source_type   text not null check (source_type in ('rsp_pdf', 'photo', 'image')),
  file_path     text not null,
  status        text not null default 'uploaded'
                  check (status in ('uploaded','processing','extracted','confirmed','failed')),
  prescribed_at date,
  doctor_name   text,
  rsp_number    text,
  access_code   text, -- sensitive — prefer not storing; if stored encrypt at app level
  raw_extraction jsonb,
  created_at    timestamptz not null default now()
);

alter table prescriptions enable row level security;

create policy "Users can manage own prescriptions"
  on prescriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- PRESCRIPTION ITEMS
-- ============================================================
create table if not exists prescription_items (
  id                    uuid primary key default uuid_generate_v4(),
  prescription_id       uuid not null references prescriptions on delete cascade,
  drug_id               uuid references drugs,
  extracted_name        text not null,
  extracted_dosage      text,
  extracted_form        text,
  quantity              numeric,
  posology_text         text,
  posology_structured   jsonb,
  match_confidence      float check (match_confidence between 0 and 1),
  match_status          text not null default 'unmatched'
                          check (match_status in ('matched','ambiguous','unmatched','manual')),
  field_confidences     jsonb,
  created_at            timestamptz not null default now()
);

alter table prescription_items enable row level security;

create policy "Users can manage own prescription items"
  on prescription_items for all
  using (
    exists (
      select 1 from prescriptions p
      where p.id = prescription_items.prescription_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from prescriptions p
      where p.id = prescription_items.prescription_id
        and p.user_id = auth.uid()
    )
  );

-- ============================================================
-- USER MEDICATIONS
-- ============================================================
create table if not exists user_medications (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references profiles on delete cascade,
  drug_id             uuid references drugs,
  prescription_item_id uuid references prescription_items,
  display_name        text not null,
  dosage              text,
  start_date          date,
  end_date            date,
  source              text not null check (source in ('prescription','manual')),
  quantity_on_hand    numeric,
  refill_threshold    numeric,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

alter table user_medications enable row level security;

create policy "Users can manage own medications"
  on user_medications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- SCHEDULES
-- ============================================================
create table if not exists schedules (
  id                  uuid primary key default uuid_generate_v4(),
  user_medication_id  uuid not null references user_medications on delete cascade,
  time_of_day         time not null,
  days_of_week        int[] not null default '{0,1,2,3,4,5,6}',
  dose_amount         numeric,
  dose_unit           text,
  with_food           boolean not null default false,
  created_at          timestamptz not null default now()
);

alter table schedules enable row level security;

create policy "Users can manage own schedules"
  on schedules for all
  using (
    exists (
      select 1 from user_medications m
      where m.id = schedules.user_medication_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from user_medications m
      where m.id = schedules.user_medication_id and m.user_id = auth.uid()
    )
  );

-- ============================================================
-- INTAKE EVENTS
-- ============================================================
create table if not exists intake_events (
  id                  uuid primary key default uuid_generate_v4(),
  user_medication_id  uuid not null references user_medications on delete cascade,
  schedule_id         uuid not null references schedules on delete cascade,
  scheduled_at        timestamptz not null,
  status              text not null default 'pending'
                        check (status in ('pending','taken','skipped','missed','snoozed')),
  responded_at        timestamptz,
  notes               text,
  created_at          timestamptz not null default now()
);

alter table intake_events enable row level security;

create policy "Users can manage own intake events"
  on intake_events for all
  using (
    exists (
      select 1 from user_medications m
      where m.id = intake_events.user_medication_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from user_medications m
      where m.id = intake_events.user_medication_id and m.user_id = auth.uid()
    )
  );

-- ============================================================
-- CHECKINS
-- ============================================================
create table if not exists checkins (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references profiles on delete cascade,
  user_medication_id  uuid references user_medications,
  recorded_at         timestamptz not null default now(),
  mood                int check (mood between 1 and 5),
  symptoms            text[],
  side_effects        text[],
  notes               text
);

alter table checkins enable row level security;

create policy "Users can manage own checkins"
  on checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CONVERSATIONS + MESSAGES
-- ============================================================
create table if not exists conversations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles on delete cascade,
  created_at  timestamptz not null default now()
);

alter table conversations enable row level security;

create policy "Users can manage own conversations"
  on conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references conversations on delete cascade,
  role             text not null check (role in ('user','assistant')),
  content          text not null,
  context_refs     jsonb,
  created_at       timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Users can manage own messages"
  on messages for all
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- ============================================================
-- CALENDAR LINKS
-- ============================================================
create table if not exists calendar_links (
  id               uuid primary key default uuid_generate_v4(),
  schedule_id      uuid not null references schedules on delete cascade,
  provider         text not null,
  external_event_id text,
  synced_at        timestamptz
);

alter table calendar_links enable row level security;

create policy "Users can manage own calendar links"
  on calendar_links for all
  using (
    exists (
      select 1 from schedules s
        join user_medications m on m.id = s.user_medication_id
      where s.id = calendar_links.schedule_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from schedules s
        join user_medications m on m.id = s.user_medication_id
      where s.id = calendar_links.schedule_id and m.user_id = auth.uid()
    )
  );
