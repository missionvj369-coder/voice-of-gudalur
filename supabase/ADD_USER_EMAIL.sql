-- ============================================================================
-- VOICE OF GUDALUR — ADD CITIZEN EMAIL TO THE USERS LEDGER
-- ----------------------------------------------------------------------------
-- Adds an optional `email` column to `users` and an 8-parameter overload of
-- `register_resident` that stores it. The 7-parameter version is left intact,
-- so PostgREST routes calls with p_email to the new overload and calls without
-- it to the old one — the app works whether or not this file has been run.
--
-- HOW TO RUN:
--   1. Open your Supabase Dashboard -> SQL Editor
--   2. Paste this whole file
--   3. Click RUN (takes ~1 second, safe to run more than once)
-- ============================================================================

-- 1. Add the optional email column (idempotent — safe to run again)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;

-- 2. Version 8-parameter register: keeps EVERYTHING the 7-parameter version
--    does (duplicate phone / GDR check, SECURITY DEFINER, returns the row)
--    and additionally stores p_email.
CREATE OR REPLACE FUNCTION public.register_resident(
  p_uid text,
  p_gudalur_id text,
  p_name text,
  p_phone text,
  p_locality_id text,
  p_locality_name text,
  p_pincode text,
  p_email text DEFAULT NULL
)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.users;
BEGIN
  -- Reject duplicate mobile numbers.
  IF EXISTS (SELECT 1 FROM public.users WHERE phone = p_phone AND uid <> p_uid) THEN
    RAISE EXCEPTION 'DUPLICATE_PHONE';
  END IF;
  -- Reject duplicate Gudalur IDs.
  IF EXISTS (SELECT 1 FROM public.users WHERE gudalur_id = p_gudalur_id AND uid <> p_uid) THEN
    RAISE EXCEPTION 'DUPLICATE_GUDALUR_ID';
  END IF;

  INSERT INTO public.users (
    uid, gudalur_id, name, phone, email,
    locality_id, locality_name, pincode,
    role, verification_level
  ) VALUES (
    p_uid, p_gudalur_id, p_name, p_phone, p_email,
    p_locality_id, p_locality_name, p_pincode,
    'LOCAL_MEMBER', 'REGISTERED'
  )
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
  RETURN;
END;
$$;

-- 3. Allow anonymous + authenticated callers to use it
GRANT EXECUTE ON FUNCTION public.register_resident(text, text, text, text, text, text, text, text)
  TO anon, authenticated;

-- 4. Optional friendly verification you can run after this script:
--    SELECT gudalur_id, name, phone, email FROM public.users
--    ORDER BY created_at DESC LIMIT 10;
-- ============================================================================
-- Done. The petition PDF now carries the citizen's e-mail once they register
-- with one (field is optional). Existing 7-parameter calls continue to work.
-- ============================================================================