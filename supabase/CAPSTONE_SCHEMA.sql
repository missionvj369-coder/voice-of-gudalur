-- Voice of Gudalur — CAPSTONE SCHEMA (petition signs, officials, batches)
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS public.petition_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sign_hash TEXT UNIQUE NOT NULL,
  user_id UUID,
  gdr_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  village TEXT,
  phone_last4 TEXT NOT NULL,
  aadhaar_last4 TEXT NOT NULL,
  aadhaar_ref TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  user_agent_hash TEXT,
  batch_no INTEGER DEFAULT 1,
  forwarded BOOLEAN DEFAULT FALSE,
  forwarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.officials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  official_email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  designation TEXT,
  phone TEXT,
  request_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.petition_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_no INTEGER UNIQUE NOT NULL,
  start_hash TEXT,
  end_hash TEXT,
  sign_count INTEGER NOT NULL DEFAULT 0,
  report_url TEXT,
  forwarded_marker TEXT,
  forwarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.petition_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petition_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "petition_signs_public_read" ON public.petition_signs;
CREATE POLICY "petition_signs_public_read" ON public.petition_signs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "officials_own_read" ON public.officials;
CREATE POLICY "officials_own_read" ON public.officials
  FOR SELECT USING (official_email = coalesce(auth.jwt() ->> 'email', ''));

CREATE OR REPLACE FUNCTION public.is_master_admin(p_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $func$
  SELECT lower(coalesce(p_email, '')) = lower(coalesce(
    (SELECT setting FROM pg_settings WHERE name = 'app.master_admin_email'),
    'vijaybalakrishnanshanmugam@gmail.com'
  ));
$func$;
GRANT EXECUTE ON FUNCTION public.is_master_admin(text) TO public, authenticated;

CREATE OR REPLACE FUNCTION public.is_approved_official(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.officials
    WHERE lower(official_email) = lower(coalesce(p_email, ''))
      AND status = 'approved'
  );
$func$;
GRANT EXECUTE ON FUNCTION public.is_approved_official(text) TO public, authenticated;

CREATE OR REPLACE FUNCTION public.record_petition_sign(
  p_user_id UUID,
  p_gdr_id TEXT,
  p_full_name TEXT,
  p_village TEXT,
  p_phone_last4 TEXT,
  p_aadhaar_last4 TEXT,
  p_aadhaar_ref TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_user_agent_hash TEXT
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_hash TEXT;
  v_count BIGINT;
  v_batch INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM public.petition_signs WHERE gdr_id = p_gdr_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_signed');
  END IF;

  v_hash := encode(gen_random_bytes(16), 'hex');

  SELECT count(*) + 1 INTO v_count FROM public.petition_signs;
  v_batch := ((v_count - 1) / 10000) + 1;

  INSERT INTO public.petition_signs
    (sign_hash, user_id, gdr_id, full_name, village, phone_last4,
     aadhaar_last4, aadhaar_ref, latitude, longitude, user_agent_hash,
     batch_no, created_at)
  VALUES
    (v_hash, p_user_id, p_gdr_id, p_full_name, p_village, p_phone_last4,
     p_aadhaar_last4, p_aadhaar_ref, p_lat, p_lng, p_user_agent_hash,
     v_batch, now());

  RETURN jsonb_build_object(
    'ok', true,
    'sign_hash', v_hash,
    'batch_no', v_batch,
    'total_signs', v_count
  );
END;
$func$;
GRANT EXECUTE ON FUNCTION public.record_petition_sign(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT
) TO authenticated, anon;
CREATE OR REPLACE FUNCTION public.verify_petition_sign(p_sign_hash TEXT)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $
DECLARE
  v_sig RECORD;
BEGIN
  SELECT s.full_name, s.village, s.phone_last4, s.aadhaar_last4,
         s.batch_no, s.created_at, u.role
    INTO v_sig
    FROM public.petition_signs s
    LEFT JOIN public.users u ON u.uid = s.user_id
    WHERE s.sign_hash = p_sign_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'full_name', v_sig.full_name,
    'village', v_sig.village,
    'phone_last4', v_sig.phone_last4,
    'aadhaar_last4', v_sig.aadhaar_last4,
    'batch_no', v_sig.batch_no,
    'created_at', v_sig.created_at,
    'signer_role', v_sig.role
  );
END;
$;
GRANT EXECUTE ON FUNCTION public.verify_petition_sign(text) TO public, anon, authenticated;
CREATE OR REPLACE FUNCTION public.request_official_access(
  p_email text, p_full_name text, p_department text, p_designation text, p_phone text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $
DECLARE v_official public.officials%ROWTYPE;
BEGIN
  IF NOT (lower(p_email) LIKE '%@%' AND lower(p_email) LIKE '%.%') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
  END IF;

  INSERT INTO public.officials
    (official_email, full_name, department, designation, phone, request_token)
  VALUES
    (lower(p_email), p_full_name, p_department, p_designation, p_phone,
     encode(gen_random_bytes(12), 'hex'))
  ON CONFLICT (official_email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        department = EXCLUDED.department,
        designation = EXCLUDED.designation,
        phone = EXCLUDED.phone,
        status = 'pending'
  RETURNING * INTO v_official;

  RETURN jsonb_build_object('ok', true, 'official_id', v_official.id, 'status', v_official.status);
END;
$;
GRANT EXECUTE ON FUNCTION public.request_official_access(text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.approve_official_access(
  p_official_id uuid, p_approved_by text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $
DECLARE
  v_approver_email TEXT := lower(coalesce(p_approved_by, ''));
BEGIN
  IF NOT public.is_master_admin(v_approver_email) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: only the master admin can approve official access';
  END IF;
  IF p_official_id IS NULL THEN
    RAISE EXCEPTION 'official id required';
  END IF;

  UPDATE public.officials
    SET status = 'approved', approved_by = p_approved_by, approved_at = now()
    WHERE id = p_official_id;

  RETURN jsonb_build_object('ok', true);
END;
$;
GRANT EXECUTE ON FUNCTION public.approve_official_access(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.official_signs_view()
RETURNS TABLE (
  sign_hash TEXT,
  gdr_id TEXT,
  full_name TEXT,
  village TEXT,
  phone_last4 TEXT,
  aadhaar_last4 TEXT,
  batch_no INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $
BEGIN
  IF NOT public.is_approved_official(auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'UNAUTHORIZED: approved official login required';
  END IF;

  RETURN QUERY
    SELECT ps.sign_hash, ps.gdr_id, ps.full_name, ps.village,
           ps.phone_last4, ps.aadhaar_last4, ps.batch_no, ps.created_at
    FROM public.petition_signs ps
    ORDER BY ps.created_at DESC;
END;
$;

CREATE OR REPLACE FUNCTION public.mark_batch_forwarded(
  p_batch_no INTEGER, p_report_url TEXT, p_forwarded_marker TEXT
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $
BEGIN
  UPDATE public.petition_signs
    SET forwarded = TRUE, forwarded_at = now()
    WHERE batch_no = p_batch_no;

  INSERT INTO public.petition_batches
    (batch_no, sign_count, report_url, forwarded_marker, forwarded_at)
  SELECT p_batch_no, count(*), p_report_url, p_forwarded_marker, now()
  FROM public.petition_signs WHERE batch_no = p_batch_no
  ON CONFLICT (batch_no) DO UPDATE
    SET report_url = EXCLUDED.report_url,
        forwarded_marker = EXCLUDED.forwarded_marker,
        forwarded_at = now(),
        sign_count = EXCLUDED.sign_count;

  RETURN jsonb_build_object('ok', true);
END;
$;
GRANT EXECUTE ON FUNCTION public.mark_batch_forwarded(integer, text, text) TO authenticated;
