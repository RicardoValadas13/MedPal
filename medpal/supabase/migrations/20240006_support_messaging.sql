-- ============================================================
-- ADMIN ROLE
-- ============================================================
-- is_admin can only be granted via service role / direct SQL — a
-- trigger blocks authenticated users from elevating themselves.
alter table profiles add column if not exists is_admin boolean not null default false;

create or replace function prevent_is_admin_self_change()
returns trigger as $$
begin
  if new.is_admin is distinct from old.is_admin
     and coalesce(auth.role(), 'postgres') not in ('service_role', 'postgres') then
    raise exception 'is_admin can only be changed by an administrator';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_is_admin_guard on profiles;
create trigger profiles_is_admin_guard
  before update on profiles
  for each row execute function prevent_is_admin_self_change();

-- Helper used by admin RLS policies
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- ============================================================
-- SUPPORT CONVERSATIONS
-- ============================================================
-- conversations.type distinguishes AI chat ('agent') threads from
-- admin support ('support') threads. One support thread per patient.
alter table conversations add column if not exists type text not null default 'agent'
  check (type in ('agent', 'support'));
alter table conversations add column if not exists resolved boolean not null default false;

-- messages.sender_type identifies who wrote it; role stays for the
-- model-facing user/assistant mapping used by the AI chat.
alter table messages add column if not exists sender_type text
  check (sender_type in ('admin', 'patient', 'agent'));
update messages
  set sender_type = case when role = 'assistant' then 'agent' else 'patient' end
  where sender_type is null;
alter table messages alter column sender_type set default 'patient';
alter table messages alter column sender_type set not null;

-- Read tracking for unread counts (flipped when the other side opens
-- the thread)
alter table messages add column if not exists read boolean not null default false;

-- ============================================================
-- ADMIN RLS POLICIES (patients keep their existing own-rows policies)
-- ============================================================
create policy "Admins can view all profiles"
  on profiles for select using (public.is_admin());

create policy "Admins can view all patient profiles"
  on patient_profiles for select using (public.is_admin());

create policy "Admins can view all conversations"
  on conversations for select using (public.is_admin());

create policy "Admins can create conversations"
  on conversations for insert with check (public.is_admin());

create policy "Admins can update conversations"
  on conversations for update
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins can view all messages"
  on messages for select using (public.is_admin());

create policy "Admins can send messages"
  on messages for insert with check (public.is_admin());

create policy "Admins can update messages"
  on messages for update
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- REALTIME
-- ============================================================
-- Live message delivery; RLS applies to the change feed, so patients
-- only ever receive their own rows.
do $$
begin
  alter publication supabase_realtime add table messages;
exception
  when duplicate_object then null;
end $$;
