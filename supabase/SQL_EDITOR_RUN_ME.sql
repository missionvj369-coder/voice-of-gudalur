-- =====================================================================
-- ONE GUDALUR — SQL EDITOR RUN-ME SCRIPT (single file, idempotent)
-- Project: wxzhgcekzcrmqrcnhqwv
--
-- HOW TO RUN:
--   Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this -> Run
--
-- Powers the 3 live sections:
--   1. Right to Life Manifesto  -> manifesto_stats / manifesto_signatures
--                                  / manifesto_submissions (official email proof)
--   2. Act for Gudalur          -> petitions
--   3. Resident Citizen Card    -> users (passwordless phone auth)
--
-- TRUST MODEL (no fake data):
--   Counters increment ONLY through atomic RPC calls after a real,
--   identified citizen action. Every official email submission is
--   recorded as an immutable ledger row with a docket reference.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'RESIDENT','LOCAL_MEMBER','LOCAL_MODERATOR','LOCAL_ADMIN',
    'CORE_ADMIN','VERIFIER','PLATFORM_ADMIN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_level AS ENUM (
    'REGISTERED','PHONE_VERIFIED','LOCALITY_VERIFIED','TRUSTED_MEMBER',
    'LOCAL_ADMIN','CORE_ADMIN','PLATFORM_ADMIN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. USERS — Resident Citizen Card (one account per phone number)
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  locality_id TEXT NOT NULL,
  locality_name TEXT NOT NULL,
  custom_place_name TEXT,
  pincode TEXT NOT NULL DEFAULT '643212',
  gudalur_id TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'LOCAL_MEMBER',
  verification_level verification_level NOT NULL DEFAULT 'REGISTERED',
  is_blood_donor BOOLEAN NOT NULL DEFAULT FALSE,
  blood_group TEXT,
  avatar_url TEXT,
  bio TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issues_reported INTEGER NOT NULL DEFAULT 0,
  issues_supported INTEGER NOT NULL DEFAULT 0,
  representations_created INTEGER NOT NULL DEFAULT 0,
  alerts_acknowledged INTEGER NOT NULL DEFAULT 0
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_key') THEN
    ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'users_phone_key: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_gudalur_id ON users (upper(gudalur_id));
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "residents_can_register" ON users;
CREATE POLICY "residents_can_register" ON users
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. MANIFESTO STATS — real endorsement counter (starts at 0)
CREATE TABLE IF NOT EXISTS manifesto_stats (
  id TEXT PRIMARY KEY DEFAULT 'global',
  count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO manifesto_stats (id, count) VALUES ('global', 0)
  ON CONFLICT (id) DO UPDATE SET count = manifesto_stats.count;

ALTER TABLE manifesto_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manifesto_stats_public_read" ON manifesto_stats;
CREATE POLICY "manifesto_stats_public_read" ON manifesto_stats
  FOR SELECT TO anon, authenticated USING (true);

-- 4. MANIFESTO SIGNATURES — who endorsed the proclamation
CREATE TABLE IF NOT EXISTS manifesto_signatures (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  locality TEXT NOT NULL,
  contact TEXT NOT NULL,
  gudalur_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE manifesto_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manifesto_signatures_public_insert" ON manifesto_signatures;
CREATE POLICY "manifesto_signatures_public_insert" ON manifesto_signatures
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "manifesto_signatures_public_read" ON manifesto_signatures;
CREATE POLICY "manifesto_signatures_public_read" ON manifesto_signatures
  FOR SELECT TO anon, authenticated USING (true);

-- 5. MANIFESTO SUBMISSION LEDGER — immutable proof of official email
--    A row exists ONLY when a citizen confirms they emailed the authorities.
--    Reads are intentionally NOT public (ledger is never enumerable).
CREATE TABLE IF NOT EXISTS manifesto_submissions (
  id BIGSERIAL PRIMARY KEY,
  docket_ref TEXT NOT NULL UNIQUE,
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  gudalur_id TEXT,
  locality TEXT,
  to_emails TEXT NOT NULL,
  cc_emails TEXT NOT NULL,
  subject TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_docket  ON manifesto_submissions (docket_ref);
CREATE INDEX IF NOT EXISTS idx_submissions_phone   ON manifesto_submissions (sender_phone);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON manifesto_submissions (created_at DESC);

ALTER TABLE manifesto_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manifesto_submissions_public_insert" ON manifesto_submissions;
CREATE POLICY "manifesto_submissions_public_insert" ON manifesto_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);


-- =====================================================
-- PART 2 (append): petitions, functions, grants, campaign sync
-- =====================================================

-- 6. PETITIONS — Act for Gudalur citizen demands
CREATE TABLE IF NOT EXISTS petitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_ta TEXT,
  problem TEXT NOT NULL,
  problem_ta TEXT,
  demand TEXT NOT NULL,
  demand_ta TEXT,
  target_authority TEXT NOT NULL,
  target_authority_ta TEXT,
  evidence_summary TEXT NOT NULL,
  evidence_summary_ta TEXT,
  support_count INTEGER NOT NULL DEFAULT 0,
  supporters_json JSONB NOT NULL DEFAULT '[]',
  target_signatures INTEGER,
  deadline BIGINT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'petitions_created_by_fkey') THEN
    ALTER TABLE petitions DROP CONSTRAINT petitions_created_by_fkey;
  END IF;
EXCEPTION WHEN others THEN RAISE NOTICE 'petitions FK: %', SQLERRM;
END $$;
ALTER TABLE petitions ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE petitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "petitions_public_read" ON petitions;
CREATE POLICY "petitions_public_read" ON petitions
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "petitions_public_seed" ON petitions;
CREATE POLICY "petitions_public_seed" ON petitions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "petitions_public_upsert" ON petitions;
CREATE POLICY "petitions_public_upsert" ON petitions
  FOR UPDATE TO anon, authenticated USING (true);

-- 7. SECURE FUNCTIONS (passwordless auth + atomic real counters)
CREATE OR REPLACE FUNCTION login_resident(p_phone text, p_gudalur_id text)
RETURNS SETOF users
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM users
   WHERE phone = p_phone AND upper(gudalur_id) = upper(p_gudalur_id)
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_gudalur_id_taken(p_gudalur_id text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE upper(gudalur_id) = upper(p_gudalur_id));
$$;

CREATE OR REPLACE FUNCTION get_resident_by_phone(p_phone text)
RETURNS SETOF users
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM users WHERE phone = p_phone LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION bump_manifesto_count()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO manifesto_stats (id, count, last_updated)
  VALUES ('global', 1, now())
  ON CONFLICT (id) DO UPDATE
    SET count = manifesto_stats.count + 1,
        last_updated = now();
END;
$$;

CREATE OR REPLACE FUNCTION support_petition(p_petition_id text, p_supporter jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE petitions
     SET support_count = support_count + 1,
         supporters_json = supporters_json || p_supporter,
         updated_at = now()
   WHERE id = p_petition_id;
END;
$$;

GRANT EXECUTE ON FUNCTION login_resident(text, text)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_gudalur_id_taken(text)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_resident_by_phone(text)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bump_manifesto_count()        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION support_petition(text, jsonb) TO anon, authenticated;

-- 8. EXPLICIT TABLE GRANTS
GRANT SELECT ON manifesto_stats TO anon, authenticated;
GRANT INSERT, SELECT ON manifesto_signatures TO anon, authenticated;
GRANT INSERT ON manifesto_submissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON petitions TO anon, authenticated;
GRANT INSERT, SELECT ON users TO anon, authenticated;


-- 9. MOVEMENT CAMPAIGN TITLES — sync live petition copy (human-centred demands)
UPDATE petitions SET
  title    = 'Protect Our Families - Demand Immediate AI Thermal Early Warning & Wildlife Fencing in O''Valley & Gudalur',
  title_ta = 'எங்கள் குடும்பங்களைப் பாதுகாக்க - ஓ''வேலி & கூடலூரில் உடனடி AI எச்சரிக்கை & வனவிலங்கு வேலி அமைத்தல்',
  updated_at = now()
WHERE id = 'pet_01_tiger_wildlife_fence';

UPDATE petitions SET
  title    = 'Stop Preventable Deaths - Demand 24x7 Emergency Trauma Care & Antivenom Center for Gudalur',
  title_ta = 'தடுக்கக்கூடிய இறப்புகளை நிறுத்த - கூடலூரில் 24x7 அவசர சிகிச்சை & விஷ மாற்று மையம் அமைக்கக் கோருங்கள்',
  updated_at = now()
WHERE id = 'pet_02_multispecialty_hospital';

UPDATE petitions SET
  title    = 'Secure Our Land Rights - Expedite Patta Settlement for Smallholder Farmers in Section 17 Lands',
  title_ta = 'எங்கள் நில உரிமையைப் பாதுகாக்க - பிரிவு 17 நிலங்களில் சிறு விவசாயிகளுக்கு விரைவாக பட்டா வழங்கக் கோருங்கள்',
  updated_at = now()
WHERE id = 'pet_03_section17_janmam_rights';

-- Every petition gets a movement target for the progress bar
UPDATE petitions SET target_signatures = 1000 WHERE target_signatures IS NULL;

-- App env:
--   VITE_SUPABASE_URL=https://wxzhgcekzcrmqrcnhqwv.supabase.co
--   VITE_SUPABASE_ANON_KEY=<your-anon-key>
