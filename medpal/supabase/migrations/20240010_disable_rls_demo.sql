-- Demo mode: disable RLS on all app tables so the anon key can read/write freely.
alter table prescriptions        disable row level security;
alter table prescription_items   disable row level security;
alter table user_medications     disable row level security;
alter table schedules            disable row level security;
alter table profiles             disable row level security;
