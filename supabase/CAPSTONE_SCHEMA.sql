-- ═══════════════════════════════════════════════════════════════════
-- Voice of Gudalur — CAPSTONE SCHEMA
-- Petition Signatures (Mudhalvan Mugavari grievance), Official Admin
-- Audit Portal, and 10,000-sign batch reports.
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1) Petition signs ──────────────────────────────────────────────
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

-- ── 2) Officials access control ────────────────────────────────────
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

-- ── 3) 10,000-sign batch reports ───────────────────────────────────
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
-- ── 4) Row-Level Security: deny all direct writes; access via RPC ──
ALTER TABLE public.petition_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petition_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "petition_signs_public_read" ON public.petition_signs;
CREATE POLICY "petition_signs_public_read" ON public.petition_signs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "officials_own_read" ON public.officials;
CREATE POLICY "officials_own_read" ON public.officials
  FOR SELECT USING (official_email = auth.jwt() ->> 'email');

CREATE OR REPLACE FUNCTION public.is_approved_official(p_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.officials
    WHERE lower(official_email) = lower(coalesce(p_email, ''))
      AND status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_approved_official(text) TO public, authenticated;

CREATE OR REPLACE FUNCTION public.official_signs_view()
RETURNS TABLE (
  sign_hash text, gdr_id text, full_name text, village text,
  phone_last4 text, aadhaar_last4 text, batch_no integer,
  created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.official_signs_view() TO authenticated;

-- ── 5) Record a verified petition signature ────────────────────────
CREATE OR REPLACE FUNCTION public.record_petition_sign(
  p_sign_hash text,
  p_gdr_id text,
  p_full_name text,
  p_village text,
  p_phone text,
  p_aadhaar_last4 text,
  p_aadhaar_ref text,
  p_lat double precision,
  p_lng double precision,
  p_user_agent_hash text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer; v_batch integer; v_sig public.petition_signs%ROWTYPE;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.petition_signs WHERE gdr_id = p_gdr_id;
  IF v_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_signed');
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.petition_signs;
  v_batch := (v_count / 10000) + 1;

  INSERT INTO public.petition_signs (
    sign_hash, gdr_id, full_name, village, phone_last4, aadhaar_last4,
    aadhaar_ref, latitude, longitude, user_agent_hash, batch_no
  ) VALUES (
    p_sign_hash, p_gdr_id, p_full_name, p_village,
    right(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), 4),
    p_aadhaar_last4, p_aadhaar_ref, p_lat, p_lng, p_user_agent_hash, v_batch
  ) RETURNING * INTO v_sig;

  RETURN jsonb_build_object(
    'ok', true, 'sign_hash', v_sig.sign_hash,
    'batch_no', v_sig.batch_no, 'created_at', v_sig.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_petition_sign(
  text, text, text, text, text, text, text, double precision, double precision, text
) TO authenticated;

-- ── 6) Public verification (masked) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_petition_sign(p_sign_hash text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_sig public.petition_signs%ROWTYPE;
BEGIN
  SELECT * INTO v_sig FROM public.petition_signs WHERE sign_hash = p_sign_hash;
  IF v_sig.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object(
    'valid', true,
    'full_name', v_sig.full_name,
    'village', v_sig.village,
    'phone_last4', v_sig.phone_last4,
    'aadhaar_last4', v_sig.aadhaar_last4,
    'batch_no', v_sig.batch_no,
    'created_at', v_sig.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_petition_sign(text) TO public, anon, authenticated;
-- ── 7) Official access request / approval ──────────────────────────
CREATE OR REPLACE FUNCTION public.request_official_access(
  p_email text, p_full_name text, p_department text, p_designation text, p_phone text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_official public.officials%ROWTYPE;
BEGIN
  IF NOT (lower(p_email) LIKE '%@%' AND lower(p_email) LIKE '%.%') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
  END IF;
  INSERT INTO public.officials (official_email, full_name, department, designation, phone, request_token)
  VALUES (lower(p_email), p_full_name, p_department, p_designation, p_phone,
          encode(gen_random_bytes(12), 'hex'))
  ON CONFLICT (official_email) DO UPDATE
    SET full_name = EXCLUDED.full_name, department = EXCLUDED.department,
        designation = EXCLUDED.designation, phone = EXCLUDED.phone,
        status = 'pending'
  RETURNING * INTO v_official;
  RETURN jsonb_build_object('ok', true, 'official_id', v_official.id, 'status', v_official.status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_official_access(text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.approve_official_access(
  p_official_id uuid, p_approved_by text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_approver_email text := lower(coalesce(p_approved_by, ''));
  v_master_admin text := lower(coalesce(
    (SELECT setting FROM pg_settings WHERE name = 'app.master_admin_email'),
    'vijaybalakrishnanshanmugam@gmail.com'
  ));
BEGIN
  IF v_approver_email <> v_master_admin THEN
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
$$;

GRANT EXECUTE ON FUNCTION public.approve_official_access(uuid, text) TO authenticated;

-- ── 8) Batch report (10,000-sign milestone) ────────────────────────
CREATE OR REPLACE FUNCTION public.mark_batch_forwarded(
  p_batch_no integer, p_report_url text, p_forwarded_marker text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.petition_signs SET forwarded = TRUE, forwarded_at = now()
  WHERE batch_no = p_batch_no;
  INSERT INTO public.petition_batches (batch_no, sign_count, report_url, forwarded_marker, forwarded_at)
  SELECT p_batch_no, count(*), p_report_url, p_forwarded_marker, now()
  FROM public.petition_signs WHERE batch_no = p_batch_no
  ON CONFLICT (batch_no) DO UPDATE
    SET report_url = EXCLUDED.report_url, forwarded_marker = EXCLUDED.forwarded_marker,
        forwarded_at = now(), sign_count = EXCLUDED.sign_count;
  RETURN jsonb_build_object('ok', true);
END;
$$;