-- ============================================================
-- ONE GUDALUR — FOCUS APP SCHEMA (Supabase)
-- App now has exactly 3 public sections:
--   1. Right to Life Manifesto   (endorsements)
--   2. Act for Gudalur           (petition signatures)
--   3. Resident Citizen Card     (phone-only auth)
--
-- AUTH MODEL (no passwords anywhere):
--   • Register  -> phone number only; a UNIQUE Gudalur ID
--                  (e.g. GD-2026-123456) is generated & saved.
--   • Login     -> phone number + Gudalur ID number.
--
-- Run this entire file in the Supabase SQL Editor.
-- It is idempotent: safe to run multiple times.
-- ============================================================

-- ------------------------------------------------------------
-- 1. USERS — one resident account per phone number
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_key') THEN
    ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Skipping users_phone_key: %', SQLERRM;
END $$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Residents (anonymous visitors) may create their card. Reads happen
-- exclusively through the SECURITY DEFINER functions below so the
-- resident directory is never publicly enumerable.
DROP POLICY IF EXISTS "residents_can_register" ON users;
CREATE POLICY "residents_can_register" ON users
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ------------------------------------------------------------
-- 2. SECURE AUTH FUNCTIONS (passwordless phone + Gudalur ID)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION login_resident(p_phone text, p_gudalur_id text)
RETURNS SETOF users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM users
   WHERE phone = p_phone
     AND upper(gudalur_id) = upper(p_gudalur_id)
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_gudalur_id_taken(p_gudalur_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE upper(gudalur_id) = upper(p_gudalur_id));
$$;

CREATE OR REPLACE FUNCTION get_resident_by_phone(p_phone text)
RETURNS SETOF users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM users WHERE phone = p_phone LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION login_resident(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_gudalur_id_taken(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_resident_by_phone(text) TO anon, authenticated;


-- ------------------------------------------------------------
-- 3. MANIFESTO ENDORSEMENTS (Right to Life page)
-- ------------------------------------------------------------
ALTER TABLE manifesto_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manifesto_stats_public_read" ON manifesto_stats;
CREATE POLICY "manifesto_stats_public_read" ON manifesto_stats
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE manifesto_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manifesto_signatures_public_insert" ON manifesto_signatures;
CREATE POLICY "manifesto_signatures_public_insert" ON manifesto_signatures
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "manifesto_signatures_public_read" ON manifesto_signatures;
CREATE POLICY "manifesto_signatures_public_read" ON manifesto_signatures
  FOR SELECT TO anon, authenticated USING (true);

-- Atomically bumps the global endorsement counter
CREATE OR REPLACE FUNCTION bump_manifesto_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO manifesto_stats (id, count, last_updated)
  VALUES ('global', 1, now())
  ON CONFLICT (id) DO UPDATE
    SET count = manifesto_stats.count + 1,
        last_updated = now();
END;
$$;

GRANT EXECUTE ON FUNCTION bump_manifesto_count() TO anon, authenticated;

-- ------------------------------------------------------------
-- 4. PETITIONS — ACT FOR GUDALUR
-- ------------------------------------------------------------
-- Allow seeding the master demands without a resident FK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'petitions_created_by_fkey') THEN
    ALTER TABLE petitions DROP CONSTRAINT petitions_created_by_fkey;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Skipping petitions FK drop: %', SQLERRM;
END $$;
ALTER TABLE petitions ALTER COLUMN created_by DROP NOT NULL;

-- Structured supporter list + optional campaign targets
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS supporters_json JSONB NOT NULL DEFAULT '[]';
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS target_signatures INTEGER;
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS deadline BIGINT;

-- Accept plain-text statuses (OPEN / IN_GOVT_REVIEW / ...) instead of the old enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'petitions' AND column_name = 'status' AND udt_name = 'petition_status'
  ) THEN
    ALTER TABLE petitions ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE petitions ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

ALTER TABLE petitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "petitions_public_read" ON petitions;
CREATE POLICY "petitions_public_read" ON petitions
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "petitions_public_seed" ON petitions;
CREATE POLICY "petitions_public_seed" ON petitions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Atomically increments support_count and appends the supporter
CREATE OR REPLACE FUNCTION support_petition(p_petition_id text, p_supporter jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE petitions
     SET support_count = support_count + 1,
         supporters_json = supporters_json || p_supporter,
         updated_at = now()
   WHERE id = p_petition_id;
END;
$$;

GRANT EXECUTE ON FUNCTION support_petition(text, jsonb) TO anon, authenticated;

-- ------------------------------------------------------------
-- Done. Configure the app with:
--   VITE_SUPABASE_URL=https://<your-project>.supabase.co
--   VITE_SUPABASE_ANON_KEY=<your-anon-key>
-- ------------------------------------------------------------
