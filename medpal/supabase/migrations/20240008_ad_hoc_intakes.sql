create table if not exists ad_hoc_intakes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles on delete cascade,
  drug_name   text not null,
  dosage      text,
  reason      text,
  taken_at    timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
