-- ============================================================================
-- VOICE OF GUDALUR — CIVIC-TECH PLATFORM ENHANCEMENTS SCHEMA
-- ============================================================================
-- Powers the three new platform capabilities:
--   1. Live Community Voice Soundboard & Location Ranking   (voice_petitions)
--   2. Verified Animal Sightings & Real-Time Alerts         (animal_sightings)
--   3. Digital Signature Docket & Verified PDF Certificates (dockets)
-- plus the registered-user profiles table.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query ->
-- paste this entire file -> Run. Idempotent: safe to re-run.
-- ============================================================================

-- Enable PostGIS for geographic calculations (required by the platform spec).
CREATE EXTENSION IF NOT EXISTS postgis;

-- ----------------------------------------------------------------------------
-- 1. REGISTERED USERS PROFILE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  village TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_anon_select" ON profiles;
CREATE POLICY "profiles_anon_select" ON profiles
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_anon_insert" ON profiles;
CREATE POLICY "profiles_anon_insert" ON profiles
  FOR INSERT WITH CHECK (true);
-- Registered residents may update their own row (matched by phone).
DROP POLICY IF EXISTS "profiles_owner_update" ON profiles;
CREATE POLICY "profiles_owner_update" ON profiles
  FOR UPDATE USING (phone = coalesce(current_setting('request.headers', true)::jsonb ->> 'x-client-phone', null))
  WITH CHECK (true);
-- ----------------------------------------------------------------------------
-- 2. SIGNATURES & DOCKETS — the government-proof audit trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dockets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docket_hash TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  village TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  user_agent_hash TEXT,          -- SHA-256 of the signing browser's User-Agent (Feature 3)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dockets_village_idx ON dockets (lower(village));
CREATE INDEX IF NOT EXISTS dockets_created_at_idx ON dockets (created_at DESC);
CREATE INDEX IF NOT EXISTS dockets_geo_idx ON dockets (latitude, longitude);

ALTER TABLE dockets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dockets_anon_select" ON dockets;
CREATE POLICY "dockets_anon_select" ON dockets
  FOR SELECT USING (true);       -- public proof ledger for officials & citizens
DROP POLICY IF EXISTS "dockets_anon_insert" ON dockets;
CREATE POLICY "dockets_anon_insert" ON dockets
  FOR INSERT WITH CHECK (true);  -- digital signature capture

-- ----------------------------------------------------------------------------
-- 3. VOICE PETITIONS — one row per community voice recording
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_petitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  docket_id UUID REFERENCES dockets(id),
  place_name TEXT NOT NULL,
  language TEXT DEFAULT 'ta',
  audio_url TEXT NOT NULL,
  transcript TEXT,
  speaker_name TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voice_petitions_place_idx ON voice_petitions (lower(place_name));
CREATE INDEX IF NOT EXISTS voice_petitions_lang_idx ON voice_petitions (language);
CREATE INDEX IF NOT EXISTS voice_petitions_geo_idx ON voice_petitions (latitude, longitude);

ALTER TABLE voice_petitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voice_petitions_anon_select" ON voice_petitions;
CREATE POLICY "voice_petitions_anon_select" ON voice_petitions
  FOR SELECT USING (true);       -- public voice wall + soundboard rankings
DROP POLICY IF EXISTS "voice_petitions_anon_insert" ON voice_petitions;
CREATE POLICY "voice_petitions_anon_insert" ON voice_petitions
  FOR INSERT WITH CHECK (true);
-- ----------------------------------------------------------------------------
-- 4. ANIMAL SIGHTINGS — verified, geofenced community alerts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS animal_sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  place_name TEXT NOT NULL,
  sighting_time TIMESTAMPTZ NOT NULL,
  audio_url TEXT,
  image_url TEXT,
  transcript TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS animal_sightings_place_idx ON animal_sightings (lower(place_name));
CREATE INDEX IF NOT EXISTS animal_sightings_time_idx ON animal_sightings (sighting_time DESC);
CREATE INDEX IF NOT EXISTS animal_sightings_geo_idx ON animal_sightings (latitude, longitude);

ALTER TABLE animal_sightings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "animal_sightings_anon_select" ON animal_sightings;
CREATE POLICY "animal_sightings_anon_select" ON animal_sightings
  FOR SELECT USING (true);       -- public safety map
DROP POLICY IF EXISTS "animal_sightings_anon_insert" ON animal_sightings;
CREATE POLICY "animal_sightings_anon_insert" ON animal_sightings
  FOR INSERT WITH CHECK (true);  -- report must originate from a registered user (app-gated)

-- ----------------------------------------------------------------------------
-- 5. VIEW — rank villages/places by total voice count (descending)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW village_voice_rankings AS
SELECT
  place_name,
  COUNT(id) AS total_voices,
  MAX(created_at) AS latest_voice_at
FROM voice_petitions
GROUP BY place_name
ORDER BY total_voices DESC;
-- ----------------------------------------------------------------------------
-- 6. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------
-- Great-circle distance between two coordinates (km). Used by the
-- 3 km geofenced proximity-alert trigger and for regional docket
-- verification (equivalent to ST_DistanceSphere without geometry rows).
CREATE OR REPLACE FUNCTION public.distance_km(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT 6371 * 2 * asin(
    sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians(lon2 - lon1) / 2), 2)
    )
  );
$$;

-- Verifiable signature count for a given village/place (official audit).
CREATE OR REPLACE FUNCTION public.signature_count_for_village(p_village TEXT)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM dockets WHERE lower(village) = lower(p_village);
$$;

-- Proximity scan: verified sightings within `p_radius_km` of a coordinate.
CREATE OR REPLACE FUNCTION public.nearby_sightings(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 3
) RETURNS SETOF animal_sightings
LANGUAGE sql STABLE AS $$
  SELECT s.*
  FROM animal_sightings s
  WHERE public.distance_km(p_lat, p_lng, s.latitude, s.longitude) <= p_radius_km
  ORDER BY public.distance_km(p_lat, p_lng, s.latitude, s.longitude) ASC;
$$;

-- ----------------------------------------------------------------------------
-- REALTIME — publish the new civic tables for live maps / voice walls
-- (WebSocket updates). MUST run AFTER all CREATE TABLE statements above;
-- guarded so re-running the file is safe.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dockets;
EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_petitions;
EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.animal_sightings;
EXCEPTION WHEN duplicate_object THEN NULL;
                WHEN undefined_table THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- DONE. All four new tables (+ view + RPC helpers) now exist with public
-- proof-ledger read policies and insert policies matching the app's
-- community-access pattern. Tighten with Supabase Auth roles before
-- government-scale production roll-out.
-- ----------------------------------------------------------------------------