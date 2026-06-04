-- ============================================================
-- PATIENT PROFILES (emergency / caregiver personal info)
-- ============================================================
-- Address and contacts are used by the emergency voice announcement
-- and caregiver SMS alerts. Treated as sensitive personal data:
-- RLS restricts every row to its owner.
create table if not exists patient_profiles (
  id                       uuid primary key references profiles on delete cascade,
  full_name                text,
  address                  text,
  floor                    text,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  caregiver_contact_name   text,
  caregiver_contact_phone  text,
  country                  text not null default 'Portugal',
  updated_at               timestamptz not null default now()
);

alter table patient_profiles enable row level security;

create policy "Users can manage own patient profile"
  on patient_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- CAREGIVER SETTINGS (PIN-protected app settings)
-- ============================================================
-- pin_hash is a bcrypt hash — never the raw PIN.
-- critical_med_ids references user_medications rows the caregiver
-- marked as critical for missed-medication alerts.
create table if not exists caregiver_settings (
  user_id           uuid primary key references profiles on delete cascade,
  pin_hash          text not null,
  missed_med_alert  boolean not null default true,
  emergency_voice   boolean not null default true,
  critical_med_ids  uuid[] not null default '{}',
  updated_at        timestamptz not null default now()
);

alter table caregiver_settings enable row level security;

create policy "Users can manage own caregiver settings"
  on caregiver_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
