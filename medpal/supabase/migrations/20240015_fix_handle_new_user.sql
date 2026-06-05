-- ============================================================
-- FIX: handle_new_user failed on real signups
-- ============================================================
-- The trigger ran as security definer WITHOUT an explicit search_path,
-- so under the auth service's connection 'profiles' did not resolve and
-- every email/password signup died with 'Database error saving new
-- user'. Schema-qualify everything and pin search_path. Also stamp
-- full_name from the signup metadata so new accounts get their name
-- without a follow-up update.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;
