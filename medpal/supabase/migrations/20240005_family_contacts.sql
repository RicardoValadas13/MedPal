-- ============================================================
-- FAMILY CONTACTS (emergency / missed-medication notify chain)
-- ============================================================
-- Up to 5 contacts per patient (enforced by trigger). priority 1 is
-- contacted first. The notify_* toggles select which alert chains a
-- contact participates in.
create table if not exists family_contacts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles on delete cascade,
  name                text not null,
  relationship        text not null
    check (relationship in ('son', 'daughter', 'partner', 'friend', 'caregiver')),
  phone               text not null,
  priority            int not null default 1,
  notify_missed_meds  boolean not null default true,
  notify_emergency    boolean not null default true,
  created_at          timestamptz not null default now()
);

alter table family_contacts enable row level security;

create policy "Users can manage own family contacts"
  on family_contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function enforce_family_contact_limit()
returns trigger as $$
begin
  if (select count(*) from family_contacts where user_id = new.user_id) >= 5 then
    raise exception 'A patient can have at most 5 family contacts';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger family_contacts_limit
  before insert on family_contacts
  for each row execute function enforce_family_contact_limit();

-- ============================================================
-- MISSED MEDICATION ALERTS (dedup ledger for the checker)
-- ============================================================
-- Written only by the missed-med-checker Edge Function (service role).
-- RLS enabled with no policies: clients can neither read nor write.
create table if not exists missed_med_alerts (
  intake_event_id  uuid primary key references intake_events on delete cascade,
  alerted_at       timestamptz not null default now()
);

alter table missed_med_alerts enable row level security;
