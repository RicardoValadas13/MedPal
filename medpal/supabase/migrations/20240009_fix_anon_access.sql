-- Demo mode: comprehensive anon access fix.
-- Disables RLS on all app tables and grants full privileges to the anon role
-- so the unauthenticated Supabase client can read/write freely.

alter table if exists profiles              disable row level security;
alter table if exists prescriptions        disable row level security;
alter table if exists prescription_items   disable row level security;
alter table if exists user_medications     disable row level security;
alter table if exists schedules            disable row level security;
alter table if exists intake_events        disable row level security;
alter table if exists checkins             disable row level security;
alter table if exists conversations        disable row level security;
alter table if exists messages             disable row level security;
alter table if exists calendar_links       disable row level security;
alter table if exists drugs                disable row level security;
alter table if exists ad_hoc_intakes       disable row level security;

grant select, insert, update, delete on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on schema public to anon;
grant usage on schema public to authenticated;
