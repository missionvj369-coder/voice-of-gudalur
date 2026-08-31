-- ============================================================================
-- VOICE OF GUDALUR — WhatsApp Voice Intake setup (Supabase SQL Editor)
-- Idempotent — safe to re-run.
--
-- Creates the wildlife_incidents table (the live alert network's backbone)
-- if it does not exist yet, then adds the WhatsApp webhook bookkeeping
-- columns used by netlify/functions/webhook.js.
-- ============================================================================

-- 1. The incidents table (exact shape the app expects: db.addWildlifeIncident,
--    realtime channel 'wildlife_incidents_changes', WildlifeHub map markers).
create table if not exists public.wildlife_incidents (
  id text primary key,
  type text not null,
  locality_id text not null,
  generalized_area text not null,
  lat numeric,
  lng numeric,
  urgency text default 'MEDIUM',
  reported_by text,
  verified_by_forest_dept boolean default false,
  timestamp timestamptz not null default now(),
  created_at timestamptz default now(),
  media_url text,
  behavior_notes text,
  herd_size integer,
  -- WhatsApp intake bookkeeping (webhook.js)
  source_ref text,
  transcript text,
  reporter_phone text
);

-- 2. Public read + open insert — sightings are community safety information.
alter table public.wildlife_incidents enable row level security;

drop policy if exists "wildlife_incidents_anon_all" on public.wildlife_incidents;
create policy "wildlife_incidents_anon_all"
  on public.wildlife_incidents
  for all using (true) with check (true);

-- 3. Indexes the app queries by.
create index if not exists idx_wildlife_locality  on public.wildlife_incidents (locality_id);
create index if not exists idx_wildlife_timestamp on public.wildlife_incidents (timestamp desc);
create index if not exists idx_wildlife_type      on public.wildlife_incidents (type);
create index if not exists idx_wildlife_urgency   on public.wildlife_incidents (urgency);
create index if not exists idx_wildlife_source_ref on public.wildlife_incidents (source_ref);

-- 4. If the table already existed before this run, add any missing columns.
alter table public.wildlife_incidents add column if not exists source_ref text;
alter table public.wildlife_incidents add column if not exists transcript text;
alter table public.wildlife_incidents add column if not exists reporter_phone text;
alter table public.wildlife_incidents add column if not exists media_url text;
alter table public.wildlife_incidents add column if not exists herd_size integer;
alter table public.wildlife_incidents add column if not exists verified_by_forest_dept boolean default false;

