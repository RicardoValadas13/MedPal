-- ============================================================
-- VISUAL GUIDES (instructional GIFs)
-- ============================================================
-- The OCR service returns, per item, a short imperative `description`
-- ("the action"). That string is the input to the GIF Generation service
-- (https://medpal-gifgen.onrender.com). We carry the description through to
-- user_medications and generate one GIF per *unique* description (deduped via
-- action_gifs.action_hash), surfaced on the per-medication "Visual guide" page.

-- 1. Carry the OCR action string through the pipeline.
alter table prescription_items add column if not exists description text;
alter table user_medications   add column if not exists description text;

-- 2. Deduplicated GIF store. Keyed by a hash of the normalized description so
--    multiple medications sharing the same action reuse a single GIF + job.
create table if not exists action_gifs (
  id           uuid primary key default uuid_generate_v4(),
  action_hash  text not null unique,             -- sha256 of normalized action
  action       text not null,                    -- the description sent to the GIF API
  job_id       text,                             -- GIF service job id being polled
  status       text not null default 'pending'
                 check (status in ('pending','processing','done','error')),
  gif_path     text,                             -- path within the public 'gifs' bucket
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists action_gifs_action_hash on action_gifs (action_hash);

-- Demo mode (see 20240006_disable_rls_demo.sql): the app uses the anon key
-- directly, so RLS stays disabled on app tables. GIFs are non-PII instructional
-- content; writes happen only via the service-role edge function.
alter table action_gifs disable row level security;

-- 3. Public bucket for finished GIFs (instructional, no patient data) so they
--    can be embedded via a plain public URL.
insert into storage.buckets (id, name, public)
values ('gifs', 'gifs', true)
on conflict (id) do nothing;
