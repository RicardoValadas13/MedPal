-- ============================================================
-- SECURITY REMEDIATION: enforce RLS that was defined but disabled
-- ============================================================
-- The original schema was applied to the remote project via the
-- dashboard, and several tables ended up with their policies created
-- but ROW LEVEL SECURITY DISABLED — policies are inert in that state,
-- leaving health data readable/writable with the public anon key.
-- Enabling RLS activates the existing own-rows policies.
alter table profiles enable row level security;
alter table prescriptions enable row level security;
alter table prescription_items enable row level security;
alter table user_medications enable row level security;
alter table schedules enable row level security;
alter table intake_events enable row level security;
alter table checkins enable row level security;

-- push_subscriptions / push_sent_log exist only on the remote
-- (dashboard-created, no migration). Bring them under RLS too; both
-- carry user_id, so standard own-rows policies apply. Guarded so this
-- migration also runs on environments where they don't exist.
do $$
begin
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'push_subscriptions') then
    execute 'alter table push_subscriptions enable row level security';
    if not exists (select from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions') then
      execute 'create policy "Users can manage own push subscriptions"
        on push_subscriptions for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id)';
    end if;
  end if;

  if exists (select from pg_tables where schemaname = 'public' and tablename = 'push_sent_log') then
    execute 'alter table push_sent_log enable row level security';
    if not exists (select from pg_policies where schemaname = 'public' and tablename = 'push_sent_log') then
      -- Written by server-side jobs (service role bypasses RLS);
      -- users may only read their own rows.
      execute 'create policy "Users can view own push log"
        on push_sent_log for select
        using (auth.uid() = user_id)';
    end if;
  end if;
end $$;
