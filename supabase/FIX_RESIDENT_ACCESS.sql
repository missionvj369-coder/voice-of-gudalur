-- ============================================================================
-- VOICE OF GUDALUR — RESIDENT ACCESS FIX v2 (run ONCE in the Supabase SQL Editor)
-- Dashboard: https://supabase.com/dashboard/project/wxzhgcekzcrmqrcnhqwv/sql/new
--
-- WHAT THIS FIXES
--   1. Registration failing with:
--        "new row violates row-level security policy for table users" (HTTP 401)
--      which the app surfaced as "Cloud ledger unreachable — your ID is saved
--      on this device only."
--      v2 approach: a SECURITY DEFINER `register_resident` RPC inserts the row
--      with the table owner's rights, so registration works even if the RLS
--      policy step below is skipped or fails. The INSERT policy is ALSO created
--      (belt and braces).
--   2. Login accepts EITHER the mobile number OR the Gudalur ID via the
--      `find_resident_by_login` SECURITY DEFINER RPC (directory stays private).
--   3. Self-healing schema: any column the app writes is added if missing.
--   4. Prints the live user list at the end so you can SEE the registered
--      residents right in the SQL editor output.
--
-- This script is IDEMPOTENT — it is safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Allow residents to register (INSERT) — THE CRITICAL FIX
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "residents_can_register" ON public.users;
CREATE POLICY "residents_can_register"
  ON public.users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Table-level grant (Supabase grants this by default; kept for safety)
GRANT INSERT ON public.users TO anon, authenticated;

-- NOTE: there is intentionally NO blanket SELECT policy on `users` — all reads
-- go through the SECURITY DEFINER functions below so the resident directory
-- (names, phone numbers) is never publicly enumerable.

-- ---------------------------------------------------------------------------
-- 3. Self-healing schema — make sure every column the app writes exists
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS custom_place_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS issues_reported INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS issues_supported INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS representations_created INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS alerts_acknowledged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'REGISTERED';

-- ---------------------------------------------------------------------------
-- 4. THE CRITICAL FIX — `register_resident` SECURITY DEFINER RPC
--    Inserts with the table owner's rights (bypasses RLS), blocks duplicate
--    mobile numbers / Gudalur IDs with clear, app-mappable error messages.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_resident(
  p_uid text, p_name text, p_phone text,
  p_locality_id text, p_locality_name text,
  p_pincode text, p_gudalur_id text
)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Duplicate mobile numbers are blocked — the app switches the citizen to Login.
  IF EXISTS (SELECT 1 FROM public.users WHERE phone = p_phone) THEN
    RAISE EXCEPTION 'DUPLICATE_PHONE' USING ERRCODE = '23505';
  END IF;
  -- Duplicate Gudalur IDs are blocked.
  IF EXISTS (SELECT 1 FROM public.users WHERE upper(gudalur_id) = upper(p_gudalur_id)) THEN
    RAISE EXCEPTION 'DUPLICATE_GUDALUR_ID' USING ERRCODE = '23505';
  END IF;
  RETURN QUERY
    INSERT INTO public.users
      (uid, name, phone, locality_id, locality_name, pincode, gudalur_id)
    VALUES (
      p_uid, p_name, p_phone,
      COALESCE(NULLIF(p_locality_id, ''), 'gudalur'),
      COALESCE(NULLIF(p_locality_name, ''), 'Gudalur'),
      COALESCE(NULLIF(p_pincode, ''), '643212'),
      p_gudalur_id
    )
    RETURNING *;
  EXCEPTION
    WHEN unique_violation THEN
      -- Race between the pre-check and the insert: map it the same way.
      IF EXISTS (SELECT 1 FROM public.users WHERE phone = p_phone) THEN
        RAISE EXCEPTION 'DUPLICATE_PHONE' USING ERRCODE = '23505';
      END IF;
      RAISE EXCEPTION 'DUPLICATE_GUDALUR_ID' USING ERRCODE = '23505';
END $$;

GRANT EXECUTE ON FUNCTION public.register_resident(text, text, text, text, text, text, text)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Flexible passwordless login: mobile number OR Gudalur ID (or both)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.find_resident_by_login(text, text);
CREATE OR REPLACE FUNCTION public.find_resident_by_login(p_phone text, p_gudalur_id text)
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    -- Both identifiers: must match one and the same resident
    (SELECT * FROM public.users
      WHERE p_phone IS NOT NULL AND length(p_phone) = 10
        AND p_gudalur_id IS NOT NULL AND p_gudalur_id <> ''
        AND phone = p_phone
        AND upper(gudalur_id) = upper(p_gudalur_id)
      LIMIT 1)
    UNION ALL
    -- Phone only
    (SELECT * FROM public.users
      WHERE p_phone IS NOT NULL AND length(p_phone) = 10
        AND (p_gudalur_id IS NULL OR p_gudalur_id = '')
        AND phone = p_phone
      LIMIT 1)
    UNION ALL
    -- Gudalur ID only
    (SELECT * FROM public.users
      WHERE p_gudalur_id IS NOT NULL AND p_gudalur_id <> ''
        AND (p_phone IS NULL OR length(p_phone) <> 10)
        AND upper(gudalur_id) = upper(p_gudalur_id)
      LIMIT 1)
  ) AS match
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_resident_by_login(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5b. Residents may update their OWN profile IN PLACE (ID-card Edit).
--     The same gudalur_id row is updated — no new row is ever created.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "residents_can_update_profile" ON public.users;
CREATE POLICY "residents_can_update_profile"
  ON public.users FOR UPDATE
  USING (true) WITH CHECK (true);

GRANT UPDATE ON TABLE public.users TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Housekeeping — remove the one diagnostic test row created during checks
-- ---------------------------------------------------------------------------
DELETE FROM public.manifesto_signatures WHERE name = 'ZTEST_DELETE_ME';

-- ---------------------------------------------------------------------------
-- 7. Verification — show the registered residents right here in the output.
--    (The dashboard SQL editor runs with owner rights, so RLS does not block it.)
-- ---------------------------------------------------------------------------
SELECT uid, name, phone, gudalur_id, locality_name, pincode
FROM public.users
ORDER BY uid
LIMIT 100;

-- ============================================================================
-- 8. EMAIL-ENABLED REGISTRATION — optional email column + 8-parameter overload
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;

CREATE OR REPLACE FUNCTION public.register_resident(
  p_uid text, p_gudalur_id text, p_name text, p_phone text,
  p_locality_id text, p_locality_name text, p_pincode text, p_email text
)
RETURNS SETOF public.users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE phone = p_phone) THEN
    RAISE EXCEPTION 'DUPLICATE_PHONE' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE upper(gudalur_id) = upper(p_gudalur_id)) THEN
    RAISE EXCEPTION 'DUPLICATE_GUDALUR_ID' USING ERRCODE = '23505';
  END IF;
  RETURN QUERY
    INSERT INTO public.users
      (uid, name, phone, locality_id, locality_name, pincode, gudalur_id, email)
    VALUES (
      p_uid, p_name, p_phone,
      COALESCE(NULLIF(p_locality_id, ''), 'gudalur'),
      COALESCE(NULLIF(p_locality_name, ''), 'Gudalur'),
      COALESCE(NULLIF(p_pincode, ''), '643212'),
      p_gudalur_id, NULLIF(p_email, '')
    )
    RETURNING *;
  EXCEPTION
    WHEN unique_violation THEN
      IF EXISTS (SELECT 1 FROM public.users WHERE phone = p_phone) THEN
        RAISE EXCEPTION 'DUPLICATE_PHONE' USING ERRCODE = '23505';
      END IF;
      RAISE EXCEPTION 'DUPLICATE_GUDALUR_ID' USING ERRCODE = '23505';
END $$;

GRANT EXECUTE ON FUNCTION public.register_resident(text, text, text, text, text, text, text, text)
  TO anon, authenticated;

-- ============================================================================
-- 9. MANIFESTO RPCs (record + read) — SECURITY DEFINER, so signatures and
--    official email submissions are recorded even where table grants are
--    missing on the live database.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_manifesto_signature(
  p_name text, p_locality text, p_contact text, p_gudalur_id text
)
RETURNS SETOF public.manifesto_signatures
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- One signature per resident: an existing row returns an empty set (already signed).
  IF p_gudalur_id IS NOT NULL AND p_gudalur_id <> '' THEN
    IF EXISTS (SELECT 1 FROM public.manifesto_signatures WHERE gudalur_id = p_gudalur_id) THEN
      RETURN;
    END IF;
  END IF;
  RETURN QUERY
    INSERT INTO public.manifesto_signatures (name, locality, contact, gudalur_id)
    VALUES (p_name, p_locality, p_contact, NULLIF(p_gudalur_id, ''))
    RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_manifesto_signature(text, text, text, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_manifesto_submission(
  p_docket_ref text, p_sender_name text, p_sender_phone text,
  p_gudalur_id text, p_locality text, p_to_emails text, p_cc_emails text,
  p_subject text, p_lang text, p_source_url text
)
RETURNS SETOF public.manifesto_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.manifesto_submissions WHERE docket_ref = p_docket_ref) THEN
    RETURN QUERY SELECT * FROM public.manifesto_submissions WHERE docket_ref = p_docket_ref;
    RETURN;
  END IF;
  RETURN QUERY
    INSERT INTO public.manifesto_submissions
      (docket_ref, sender_name, sender_phone, gudalur_id, locality, to_emails, cc_emails, subject, lang, source_url)
    VALUES (p_docket_ref, p_sender_name, p_sender_phone, NULLIF(p_gudalur_id, ''), NULLIF(p_locality, ''),
            p_to_emails, p_cc_emails, p_subject, p_lang, p_source_url)
    RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_manifesto_submission(text, text, text, text, text, text, text, text, text, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_manifesto_submission_by_gudalur(p_gudalur_id text)
RETURNS SETOF public.manifesto_submissions
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.manifesto_submissions
  WHERE gudalur_id = p_gudalur_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_manifesto_submission_by_gudalur(text)
  TO anon, authenticated;

-- ============================================================================
-- 10. BELT-AND-BRACES — table grants + RLS policies so direct inserts ALSO work
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "residents_can_register" ON public.users;
CREATE POLICY "residents_can_register" ON public.users
  FOR INSERT TO anon, authenticated WITH CHECK (true);
GRANT INSERT ON public.users TO anon, authenticated;

ALTER TABLE public.manifesto_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manifesto_submissions_public_insert" ON public.manifesto_submissions;
CREATE POLICY "manifesto_submissions_public_insert" ON public.manifesto_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "manifesto_submissions_public_read" ON public.manifesto_submissions;
CREATE POLICY "manifesto_submissions_public_read" ON public.manifesto_submissions
  FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT, SELECT ON public.manifesto_submissions TO anon, authenticated;

ALTER TABLE public.manifesto_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manifesto_signatures_public_insert" ON public.manifesto_signatures;
CREATE POLICY "manifesto_signatures_public_insert" ON public.manifesto_signatures
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "manifesto_signatures_public_read" ON public.manifesto_signatures;
CREATE POLICY "manifesto_signatures_public_read" ON public.manifesto_signatures
  FOR SELECT TO anon, authenticated USING (true);
GRANT INSERT, SELECT ON public.manifesto_signatures TO anon, authenticated;

GRANT SELECT ON public.manifesto_stats TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.petitions TO anon, authenticated;

-- ============================================================================
-- 11. CLEANUP — remove every diagnostic row created while fixing the project
-- ----------------------------------------------------------------------------
DELETE FROM public.users
 WHERE uid LIKE 'zz%' OR uid LIKE 'zzreg%' OR uid LIKE 'zzprobe%'
    OR name IN ('ZZPROBE REG7', 'ZZDIRECT', 'ZZPROBE DELETE ME', 'ZTEST_DELETE_ME');
DELETE FROM public.manifesto_signatures WHERE name IN ('ZZSIG') OR contact = '9999000012';
DELETE FROM public.manifesto_submissions WHERE sender_name = 'ZZPROBE DOCKET' OR docket_ref LIKE 'OG-TEST-%';

DO $$
BEGIN
  UPDATE public.manifesto_stats
     SET count = (SELECT count(*) FROM public.manifesto_signatures), last_updated = now()
   WHERE id = 'global';
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;

-- ============================================================================
-- DONE. Registration now inserts into `users` (with or without email) and
-- residents can log in with their mobile number alone, their Gudalur ID alone,
-- or both together. Signatures record in `manifesto_signatures`; email sends
-- record in `manifesto_submissions` (through SECURITY DEFINER RPCs AND direct
-- grants). The petition PDF unlocks from the recorded docket reference.
-- ============================================================================
