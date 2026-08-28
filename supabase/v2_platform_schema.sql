-- ============================================================================
-- VOICE OF GUDALUR — PLATFORM SCHEMA v2 (Civic Safety & Accountability)
-- Run in: Supabase Dashboard → SQL Editor → Run (idempotent, safe to re-run)
--
-- Design principles:
--   * Every incident carries a verification_status workflow:
--       REPORTED → UNDER_REVIEW → VERIFIED → OFFICIAL → RESOLVED | REJECTED
--   * Precise animal coordinates are NEVER exposed to the public:
--       the public reads via get_public_incidents() which strips lat/lng.
--   * Admin actions go through security definer RPCs gated by
--       is_platform_admin(p_uid, p_phone, p_gid) — RLS itself cannot identify
--       admins because residents authenticate by phone + Gudalur ID (no
--       Supabase auth session), so identity is verified inside the RPC.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. ADMIN CHECK HELPER (security definer; identity triple must match users row)
-- ----------------------------------------------------------------------------
create or replace function public.is_platform_admin(
  p_uid text, p_phone text, p_gid text
) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
      where uid = p_uid
        and phone = public.normalize_phone(p_phone)
        and upper(gudalur_id) = upper(p_gid)
        and role in ('LOCAL_ADMIN','CORE_ADMIN','VERIFIER','PLATFORM_ADMIN')
  );
$$;

-- Phone normaliser used by the helper (idempotent)
create or replace function public.normalize_phone(raw text) returns text
language sql immutable as $$
  select case
    when length(regexp_replace(coalesce(raw,''), '\D', '', 'g')) > 10
      then right(regexp_replace(coalesce(raw,''), '\D', '', 'g'), 10)
    else regexp_replace(coalesce(raw,''), '\D', '', 'g')
  end;
$$;

-- ----------------------------------------------------------------------------
-- 1. WILDLIFE INCIDENTS (v2 — replaces the old shape; old table is archived)
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='wildlife_incidents')
     and exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='wildlife_incidents'
               and column_name='generalized_area')
  then
    drop table if exists public.wildlife_incidents_legacy_backup cascade;
    alter table public.wildlife_incidents rename to wildlife_incidents_legacy_backup;
  end if;
end $$;

create table if not exists public.wildlife_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_type text not null check (incident_type in
    ('SIGHTING','NEAR_HOME','ROAD_CROSSING','CROP_DAMAGE','LIVESTOCK_ATTACK','HUMAN_INJURY','HUMAN_DEATH','OTHER')),
  species text not null check (species in
    ('ELEPHANT','TIGER','LEOPARD','GAUR','OTHER','UNKNOWN')),
  locality_id text,
  locality_name text not null,
  landmark text,
  latitude numeric,                    -- RESTRICTED: never returned by public RPC
  longitude numeric,                   -- RESTRICTED: never returned by public RPC
  event_date date not null default current_date,
  event_time text,
  direction text,
  description text not null,
  evidence_url text,
  reporter_uid text,                   -- nullable — anonymous reports allowed
  reporter_contact text,               -- PRIVATE: never returned publicly
  verification_status text not null default 'REPORTED' check (verification_status in
    ('REPORTED','UNDER_REVIEW','VERIFIED','OFFICIAL','RESOLVED','REJECTED')),
  source text not null default 'CITIZEN' check (source in
    ('CITIZEN','ADMIN','OFFICIAL','FOREST_DEPT')),
  verified_by text,
  verified_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_incidents_status on public.wildlife_incidents (verification_status, event_date desc);
create index if not exists idx_incidents_locality on public.wildlife_incidents (locality_name);

alter table public.wildlife_incidents enable row level security;
-- NO select policy: direct table reads are denied for everyone. The public
-- reads exclusively through get_public_incidents() (no coordinates) and
-- admins through admin_list_incidents() (identity verified inside the RPC).
drop policy if exists "incidents_public_insert" on public.wildlife_incidents;
drop policy if exists "incidents_admin_all" on public.wildlife_incidents;
drop policy if exists "wildlife_incidents_anon_all" on public.wildlife_incidents;
create policy "incidents_public_insert" on public.wildlife_incidents
  for insert with check (
    verification_status = 'REPORTED' and source = 'CITIZEN'
  );

-- ----------------------------------------------------------------------------
-- 2. ALERTS (verified safety alerts — admin created only)
-- ----------------------------------------------------------------------------
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_ta text,
  description text not null,
  description_ta text,
  category text not null default 'GENERAL' check (category in
    ('ELEPHANT','TIGER','EMERGENCY','CIVIC','GENERAL')),
  severity text not null default 'MEDIUM' check (severity in
    ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  locality_names text[] default '{}',
  instruction text,
  source text not null default 'ADMIN',
  verification_status text not null default 'VERIFIED' check (verification_status in
    ('VERIFIED','OFFICIAL','UNVERIFIED_REPORT')),
  created_by text,
  verified_by text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
alter table public.alerts enable row level security;
drop policy if exists "alerts_anon_all" on public.alerts;
create policy "alerts_public_read_active" on public.alerts
  for select using (
    active = true and verification_status in ('VERIFIED','OFFICIAL')
  );
-- writes only via admin RPCs

-- ----------------------------------------------------------------------------
-- 3. LOCALITIES (safety nodes — extendable from Supabase, not hard-coded)
-- ----------------------------------------------------------------------------
create table if not exists public.localities (
  slug text primary key,
  name text not null,
  name_ta text,
  admin_area text not null,
  revenue_village text,
  pincode text,
  lat numeric,
  lng numeric,
  border_zone text,
  description text,
  landmarks text[] default '{}',
  coordinator_name text,      -- shown publicly ONLY when an admin sets it
  coordinator_phone text,
  is_active boolean not null default true,
  sort_order integer default 100,
  updated_at timestamptz not null default now()
);
alter table public.localities enable row level security;
drop policy if exists "localities_public_read" on public.localities;
create policy "localities_public_read" on public.localities
  for select using (true);
-- writes only via admin RPCs

-- ----------------------------------------------------------------------------
-- 4. EVIDENCE DOCUMENTS (document room)
-- ----------------------------------------------------------------------------
create table if not exists public.evidence_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authority text not null,
  doc_type text not null default 'DOCUMENT' check (doc_type in
    ('GOVERNMENT','FOREST_DEPT','NTCA','COURT_ORDER','ESZ_NOTIFICATION','RESEARCH','INCIDENT_REPORT','RTI','OFFICIAL_RESPONSE','MAP','OFFICIAL_PORTAL')),
  doc_date date,
  description text,
  url text not null,
  added_by text,
  created_at timestamptz not null default now()
);
alter table public.evidence_documents enable row level security;
drop policy if exists "evidence_public_read" on public.evidence_documents;
create policy "evidence_public_read" on public.evidence_documents
  for select using (true);
-- writes only via admin RPCs

-- ----------------------------------------------------------------------------
-- 5. GOVERNMENT ACTION TRACKER
-- ----------------------------------------------------------------------------
create table if not exists public.government_actions (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  title text not null,
  description text,
  locality text,
  department text,
  submitted_date date not null default current_date,
  submitted_by text,
  evidence_url text,
  requested_action text,
  status text not null default 'SUBMITTED' check (status in
    ('SUBMITTED','ACKNOWLEDGED','RESPONSE_RECEIVED','ACTION_REPORTED','FOLLOW_UP_REQUIRED')),
  government_response text,
  response_date date,
  follow_up_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.government_actions enable row level security;
drop policy if exists "actions_public_read" on public.government_actions;
create policy "actions_public_read" on public.government_actions
  for select using (true);
-- citizen submissions + admin updates via RPCs

-- ----------------------------------------------------------------------------
-- 6. ALERT SUBSCRIPTIONS (phone privacy: no public select)
-- ----------------------------------------------------------------------------
create table if not exists public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  localities text[] default '{}',
  topics text[] default '{}',
  language text not null default 'en' check (language in ('en','ta','ml')),
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.alert_subscriptions enable row level security;
drop policy if exists "subs_public_insert" on public.alert_subscriptions;
drop policy if exists "subs_anon_all" on public.alert_subscriptions;
create policy "subs_public_insert" on public.alert_subscriptions
  for insert with check (true);
-- no select/update/delete for public — the platform manages subscriptions privately

-- ----------------------------------------------------------------------------
-- 7. PUBLIC RPCs
-- ----------------------------------------------------------------------------
-- Public: verified incidents WITHOUT coordinates or reporter identity
create or replace function public.get_public_incidents(p_limit int default 100)
returns table (
  id uuid, incident_type text, species text, locality_name text, landmark text,
  event_date date, event_time text, direction text, description text,
  verification_status text, source text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select id, incident_type, species, locality_name, landmark, event_date, event_time,
         direction, description, verification_status, source, created_at
    from public.wildlife_incidents
   where verification_status in ('VERIFIED','OFFICIAL','RESOLVED')
   order by event_date desc, created_at desc
   limit least(greatest(p_limit, 1), 200);
$$;

-- Public: create a citizen incident report; returns the sanitized row
create or replace function public.create_incident_report(p_incident jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row public.wildlife_incidents;
begin
  if coalesce(p_incident->>'incident_type','') = '' or coalesce(p_incident->>'species','') = '' then
    raise exception 'MISSING_REQUIRED_FIELDS';
  end if;
  insert into public.wildlife_incidents (
    incident_type, species, locality_id, locality_name, landmark,
    latitude, longitude, event_date, event_time, direction, description,
    evidence_url, reporter_uid, reporter_contact, verification_status, source
  ) values (
    p_incident->>'incident_type',
    p_incident->>'species',
    nullif(p_incident->>'locality_id',''),
    coalesce(nullif(p_incident->>'locality_name',''), 'Gudalur'),
    nullif(p_incident->>'landmark',''),
    nullif(p_incident->>'latitude','')::numeric,
    nullif(p_incident->>'longitude','')::numeric,
    coalesce(nullif(p_incident->>'event_date','')::date, current_date),
    nullif(p_incident->>'event_time',''),
    nullif(p_incident->>'direction',''),
    coalesce(nullif(p_incident->>'description',''), 'No description provided'),
    nullif(p_incident->>'evidence_url',''),
    nullif(p_incident->>'reporter_uid',''),
    nullif(p_incident->>'reporter_contact',''),
    'REPORTED', 'CITIZEN'
  ) returning * into v_row;
  return jsonb_build_object(
    'id', v_row.id, 'incident_type', v_row.incident_type,
    'species', v_row.species, 'locality_name', v_row.locality_name,
    'landmark', v_row.landmark, 'event_date', v_row.event_date,
    'event_time', v_row.event_time, 'direction', v_row.direction,
    'verification_status', v_row.verification_status,
    'source', v_row.source, 'created_at', v_row.created_at
  );
end $$;

-- Public: active alerts (severity-sorted)
create or replace function public.get_public_alerts()
returns setof public.alerts
language sql stable security definer set search_path = public as $$
  select * from public.alerts
   where active = true
     and (expires_at is null or expires_at > now())
   order by case severity
       when 'CRITICAL' then 1 when 'HIGH' then 2 when 'MEDIUM' then 3
       when 'LOW' then 4 else 5 end,
     created_at desc;
$$;

-- Public: citizen submits a tracked government action (status = SUBMITTED)
create or replace function public.submit_gov_action(
  p_title text, p_description text, p_locality text,
  p_department text, p_requested_action text, p_evidence_url text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_ref text;
  v_row public.government_actions;
begin
  if coalesce(trim(p_title), '') = '' then
    raise exception 'TITLE_REQUIRED';
  end if;
  v_ref := 'ACTION-' || to_char(now(), 'YYYY') || '-' ||
           lpad((floor(random() * 9000) + 1000)::text, 4, '0');
  insert into public.government_actions (
    ref, title, description, locality, department, requested_action,
    evidence_url, status, submitted_by, submitted_date
  ) values (
    v_ref, trim(p_title), nullif(p_description,''), nullif(p_locality,''),
    nullif(p_department,''), nullif(p_requested_action,''),
    nullif(p_evidence_url,''), 'SUBMITTED', 'CITIZEN SUBMISSION', current_date
  ) returning * into v_row;
  return jsonb_build_object('id', v_row.id, 'ref', v_row.ref, 'status', v_row.status);
end $$;

-- Public: alert subscription (idempotent upsert on phone)
create or replace function public.subscribe_alerts(
  p_phone text, p_localities text[], p_topics text[], p_lang text default 'en'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
begin
  if length(v_phone) <> 10 then
    raise exception 'INVALID_PHONE';
  end if;
  insert into public.alert_subscriptions (phone, localities, topics, language)
  values (v_phone, coalesce(p_localities, '{}'), coalesce(p_topics, '{}'),
          coalesce(p_lang, 'en'))
  on conflict (phone) do update
    set localities = coalesce(p_localities, '{}'),
        topics = coalesce(p_topics, '{}'),
        language = coalesce(p_lang, 'en');
  return jsonb_build_object('ok', true, 'phone_masked',
    '+91 ' || left(v_phone,2) || 'XXXXX' || right(v_phone,3));
end $$;

-- Public: honest platform stats (real counts only — no fabricated numbers)
create or replace function public.get_platform_stats()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'verified_incidents_30d', (
      select count(*) from public.wildlife_incidents
       where verification_status in ('VERIFIED','OFFICIAL','RESOLVED')
         and event_date >= current_date - 30),
    'active_alerts', (
      select count(*) from public.alerts
       where active = true and (expires_at is null or expires_at > now())),
    'localities', (select count(*) from public.localities where is_active),
    'tracked_actions', (select count(*) from public.government_actions),
    'evidence_docs', (select count(*) from public.evidence_documents),
    'last_updated', now()
  );
$$;

-- ----------------------------------------------------------------------------
-- 8. ADMIN RPCs (identity triple verified inside the function)
-- ----------------------------------------------------------------------------
-- ADMIN: list all incidents (incl. precise coords + reporter identity)
create or replace function public.admin_list_incidents(
  p_uid text, p_phone text, p_gid text, p_limit int default 200
)
returns setof public.wildlife_incidents
language sql stable security definer set search_path = public as $$
  select * from public.wildlife_incidents
   where public.is_platform_admin(p_uid, p_phone, p_gid)
   order by created_at desc
   limit least(greatest(p_limit, 1), 500);
$$;

-- ADMIN: update incident verification status
create or replace function public.admin_update_incident(
  p_uid text, p_phone text, p_gid text,
  p_id uuid, p_status text, p_notes text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin(p_uid, p_phone, p_gid) then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('REPORTED','UNDER_REVIEW','VERIFIED','OFFICIAL','RESOLVED','REJECTED') then
    raise exception 'INVALID_STATUS';
  end if;
  update public.wildlife_incidents
     set verification_status = p_status,
         review_notes = nullif(p_notes, ''),
         verified_by = (select gudalur_id from public.users where uid = p_uid limit 1),
         verified_at = case when p_status in ('VERIFIED','OFFICIAL') then now() else verified_at end,
         updated_at = now()
   where id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end $$;

-- ADMIN: create or update a safety alert
create or replace function public.admin_upsert_alert(
  p_uid text, p_phone text, p_gid text, p_alert jsonb
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin text;
  v_row public.alerts;
  v_localities text[];
begin
  if not public.is_platform_admin(p_uid, p_phone, p_gid) then
    raise exception 'FORBIDDEN';
  end if;
  select gudalur_id into v_admin from public.users where uid = p_uid limit 1;
  v_localities := coalesce(
    (select array(select jsonb_array_elements_text(p_alert->'locality_names'))), '{}');
  if p_alert ? 'id' then
    update public.alerts set
      title = coalesce(p_alert->>'title', title),
      description = coalesce(p_alert->>'description', description),
      category = coalesce(p_alert->>'category', category),
      severity = coalesce(p_alert->>'severity', severity),
      locality_names = v_localities,
      instruction = coalesce(p_alert->>'instruction', instruction),
      active = coalesce((p_alert->>'active')::boolean, active)
    where id = (p_alert->>'id')::uuid
    returning * into v_row;
  else
    insert into public.alerts (
      title, description, category, severity, locality_names, instruction,
      source, verification_status, created_by, verified_by
    ) values (
      p_alert->>'title', p_alert->>'description',
      coalesce(p_alert->>'category','GENERAL'), coalesce(p_alert->>'severity','MEDIUM'),
      v_localities, nullif(p_alert->>'instruction',''),
      'ADMIN', coalesce(p_alert->>'verification_status','VERIFIED'), v_admin, v_admin
    ) returning * into v_row;
  end if;
  return jsonb_build_object('ok', true, 'id', v_row.id);
end $$;

-- ADMIN: upsert a locality (add new Gudalur safety nodes without code changes)
create or replace function public.admin_upsert_locality(
  p_uid text, p_phone text, p_gid text, p_locality jsonb
)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin(p_uid, p_phone, p_gid) then
    raise exception 'FORBIDDEN';
  end if;
  insert into public.localities (
    slug, name, name_ta, admin_area, revenue_village, pincode, lat, lng, description
  ) values (
    p_locality->>'slug', p_locality->>'name', nullif(p_locality->>'name_ta',''),
    coalesce(p_locality->>'admin_area','Gudalur Taluk, The Nilgiris'),
    nullif(p_locality->>'revenue_village',''), nullif(p_locality->>'pincode',''),
    nullif(p_locality->>'lat','')::numeric, nullif(p_locality->>'lng','')::numeric,
    nullif(p_locality->>'description','')
  )
  on conflict (slug) do update set
    name = excluded.name,
    name_ta = excluded.name_ta,
    description = excluded.description,
    is_active = true,
    updated_at = now();
  return jsonb_build_object('ok', true, 'slug', p_locality->>'slug');
end $$;

-- ADMIN: add an evidence document
create or replace function public.admin_add_evidence(
  p_uid text, p_phone text, p_gid text,
  p_title text, p_authority text, p_doc_type text,
  p_url text, p_description text default null, p_doc_date date default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not public.is_platform_admin(p_uid, p_phone, p_gid) then
    raise exception 'FORBIDDEN';
  end if;
  insert into public.evidence_documents (title, authority, doc_type, url, description, doc_date, added_by)
  values (p_title, p_authority, coalesce(p_doc_type,'DOCUMENT'), p_url, p_description, p_doc_date,
          (select gudalur_id from public.users where uid = p_uid limit 1))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- ADMIN: update a government action record
create or replace function public.admin_update_action(
  p_uid text, p_phone text, p_gid text,
  p_id uuid, p_status text,
  p_response text default null, p_follow_up text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin(p_uid, p_phone, p_gid) then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('SUBMITTED','ACKNOWLEDGED','RESPONSE_RECEIVED','ACTION_REPORTED','FOLLOW_UP_REQUIRED') then
    raise exception 'INVALID_STATUS';
  end if;
  update public.government_actions set
    status = p_status,
    government_response = coalesce(nullif(p_response,''), government_response),
    follow_up_notes = coalesce(nullif(p_follow_up,''), follow_up_notes),
    response_date = case when p_status in ('RESPONSE_RECEIVED','ACTION_REPORTED')
                         then current_date else response_date end,
    updated_at = now()
  where id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id, 'status', p_status);
end $$;

-- ----------------------------------------------------------------------------
-- 9. GRANTS (public RPCs callable by anon; admin RPCs self-gate inside)
-- ----------------------------------------------------------------------------
grant execute on function public.get_public_incidents(int) to anon, authenticated;
grant execute on function public.create_incident_report(jsonb) to anon, authenticated;
grant execute on function public.get_public_alerts() to anon, authenticated;
grant execute on function public.submit_gov_action(text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.subscribe_alerts(text,text[],text[],text) to anon, authenticated;
grant execute on function public.get_platform_stats() to anon, authenticated;
grant execute on function public.admin_list_incidents(text,text,text,int) to anon, authenticated;
grant execute on function public.admin_update_incident(text,text,text,uuid,text,text) to anon, authenticated;
grant execute on function public.admin_upsert_alert(text,text,text,jsonb) to anon, authenticated;
grant execute on function public.admin_upsert_locality(text,text,text,jsonb) to anon, authenticated;
grant execute on function public.admin_add_evidence(text,text,text,text,text,text,date) to anon, authenticated;
grant execute on function public.admin_update_action(text,text,text,uuid,text,text,text) to anon, authenticated;

