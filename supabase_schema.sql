-- ============================================================================
-- VOICE OF GUDALUR — COMPLETE SUPABASE SCHEMA MIGRATION (Part 1: tables 1-6)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Creates missing tables + policies. Idempotent — safe to re-run.
-- Part 2 is appended below in the same file.
-- ============================================================================

-- 1. WILDLIFE INCIDENTS — elephant/tiger sighting reports
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
  herd_size integer
);
alter table public.wildlife_incidents enable row level security;
drop policy if exists "wildlife_incidents_anon_all" on public.wildlife_incidents;
create policy "wildlife_incidents_anon_all" on public.wildlife_incidents
  for all using (true) with check (true);

-- 2. ALERTS — urgent community alerts (multi-language)
create table if not exists public.alerts (
  id text primary key,
  title text not null,
  title_ta text,
  description text not null,
  description_ta text,
  category text default 'GENERAL',
  severity text default 'MEDIUM',
  affected_localities text[] default '{}',
  source text default 'COMMUNITY',
  verification_status text default 'UNVERIFIED',
  created_by text,
  verified_by text,
  created_at timestamptz default now(),
  expires_at timestamptz,
  active boolean default true,
  acknowledged_by text[] default '{}',
  broadcasted boolean default false
);
alter table public.alerts enable row level security;
drop policy if exists "alerts_anon_all" on public.alerts;
create policy "alerts_anon_all" on public.alerts
  for all using (true) with check (true);

-- 3. CIVIC ISSUES — potholes, water, lights, sanitation reports
create table if not exists public.civic_issues (
  id text primary key,
  title text not null,
  description text not null,
  category text default 'OTHER',
  photo_url text,
  locality_id text,
  locality_name text,
  lat numeric,
  lng numeric,
  address text,
  reporter_id text,
  reporter_name text,
  reporter_gudalur_id text,
  status text default 'OPEN',
  assigned_authority text,
  official_grievance_id text,
  upvotes_count integer default 0,
  upvoted_by text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.civic_issues enable row level security;
drop policy if exists "civic_issues_anon_all" on public.civic_issues;
create policy "civic_issues_anon_all" on public.civic_issues
  for all using (true) with check (true);

-- 4. GRIEVANCES — official complaint tracking (TN e-Sevai / CPGRAMS)
create table if not exists public.grievances (
  id text primary key,
  user_id text not null,
  user_gudalur_id text,
  authority text,
  complaint_id text,
  title text,
  submission_date timestamptz default now(),
  status text default 'SUBMITTED',
  notes text,
  created_at timestamptz default now()
);
alter table public.grievances enable row level security;
drop policy if exists "grievances_anon_all" on public.grievances;
create policy "grievances_anon_all" on public.grievances
  for all using (true) with check (true);

-- 5. SERVICES — verified local services (hospitals, ambulances, pharmacies)
create table if not exists public.services (
  id text primary key,
  name text not null,
  category text default 'GENERAL',
  phone text,
  locality_id text,
  locality_name text,
  description text,
  address text,
  is_24x7 boolean default false,
  is_verified boolean default false,
  created_at timestamptz default now()
);
alter table public.services enable row level security;
drop policy if exists "services_anon_all" on public.services;
create policy "services_anon_all" on public.services
  for all using (true) with check (true);

-- 6. COMMENTS — threaded comments on issues / posts
create table if not exists public.comments (
  id text primary key,
  parent_id text not null,
  user_id text,
  user_name text,
  user_gudalur_id text,
  "text" text not null,
  created_at timestamptz default now()
);
alter table public.comments enable row level security;
drop policy if exists "comments_anon_all" on public.comments;
create policy "comments_anon_all" on public.comments
  for all using (true) with check (true);

-- 7. MARKET PRICES — daily mandi prices for farmers
create table if not exists public.market_prices (
  id text primary key,
  item text not null,
  item_ta text,
  unit text default 'kg',
  min_price numeric default 0,
  max_price numeric default 0,
  market text default 'Gudalur',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.market_prices enable row level security;
drop policy if exists "market_prices_anon_all" on public.market_prices;
create policy "market_prices_anon_all" on public.market_prices
  for all using (true) with check (true);

-- 8. COMMUNITY POSTS — news, announcements, discussions
create table if not exists public.community_posts (
  id text primary key,
  user_id text,
  user_name text,
  user_gudalur_id text,
  type text default 'POST',
  content text not null,
  category text,
  image_url text,
  created_at timestamptz default now()
);
alter table public.community_posts enable row level security;
drop policy if exists "community_posts_anon_all" on public.community_posts;
create policy "community_posts_anon_all" on public.community_posts
  for all using (true) with check (true);

-- 9. HELP REQUESTS — neighbours asking for help
create table if not exists public.help_requests (
  id text primary key,
  user_id text,
  user_name text,
  user_gudalur_id text,
  title text not null,
  description text not null,
  category text,
  urgency text default 'NORMAL',
  created_at timestamptz default now()
);
alter table public.help_requests enable row level security;
drop policy if exists "help_requests_anon_all" on public.help_requests;
create policy "help_requests_anon_all" on public.help_requests
  for all using (true) with check (true);

-- 10. VOLUNTEERS — registered community volunteers
create table if not exists public.volunteers (
  id text primary key,
  user_id text,
  name text not null,
  phone text not null,
  locality_id text,
  locality_name text,
  skills text[] default '{}',
  availability text,
  status text default 'ACTIVE',
  created_at timestamptz default now()
);
alter table public.volunteers enable row level security;
drop policy if exists "volunteers_anon_all" on public.volunteers;
create policy "volunteers_anon_all" on public.volunteers
  for all using (true) with check (true);

-- 11. RPC used by endorsements (recreated for safety) + missing maintenance policies
create or replace function public.bump_manifesto_count()
returns void language sql as $$
  update public.manifesto_stats
     set count = count + 1, last_updated = now()
   where id = 'global';
$$;

drop policy if exists "manifesto_signatures_anon_delete" on public.manifesto_signatures;
create policy "manifesto_signatures_anon_delete" on public.manifesto_signatures
  for delete using (true);

drop policy if exists "manifesto_stats_anon_update" on public.manifesto_stats;
create policy "manifesto_stats_anon_update" on public.manifesto_stats
  for update using (true) with check (true);

insert into public.manifesto_stats (id, count, last_updated)
values ('global', 0, now())
on conflict (id) do nothing;

-- 12. CLEANUP — remove the fake diagnostic signature + resync the counter
delete from public.manifesto_signatures where gudalur_id = 'GD-2026-DIAG1';
update public.manifesto_stats
   set count = (select count(*) from public.manifesto_signatures),
       last_updated = now()
 where id = 'global';

-- DONE. All 15 tables now exist with permissive policies matching the app.
