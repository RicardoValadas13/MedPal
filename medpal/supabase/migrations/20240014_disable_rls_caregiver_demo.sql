-- Demo mode: disable RLS on caregiver tables so the anon key can read/write freely.
-- patient_profiles, caregiver_settings, and family_contacts were missed in 20240010.
alter table patient_profiles   disable row level security;
alter table caregiver_settings disable row level security;
alter table family_contacts    disable row level security;
