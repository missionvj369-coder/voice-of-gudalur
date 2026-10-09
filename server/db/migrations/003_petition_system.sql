-- =====================================================================
-- Migration 003 — Petition signing helpers
-- Replaces the broken Supabase `record_petition_sign` RPC whose named
-- params did not match signService.ts (p_sign_hash vs p_phone, hash
-- not returned, batch_no mismatch). The canonical signing logic is the
-- server-side transaction in server/db/repositories/petitionRepository.ts
-- (Phase 5); these functions are DB-side helpers that mirror it.
-- =====================================================================

-- Generate the next batch number atomically.
CREATE OR REPLACE FUNCTION next_petition_batch() RETURNS INT AS $$
DECLARE
  next_batch INT;
BEGIN
  SELECT COALESCE(max(batch_no), 0) + 1 INTO next_batch FROM petition_batches;
  RETURN next_batch;
END;
$$ LANGUAGE plpgsql;

-- Record a petition signature in one atomic transaction.
-- Returns the verification identifier (sign_hash). PII minimized: only
-- phone_last4 / aadhaar_last4 persisted; full phone is NOT retained.
-- NOTE: CockroachDB requires parameters with DEFAULT values to come AFTER
-- all parameters without defaults, so the required positional params are
-- listed first and defaulted params last.
CREATE OR REPLACE FUNCTION record_petition_sign(
    p_gdr_id         STRING,    -- required: resident Gudalur ID
    p_full_name      STRING,    -- required: signer name
    p_phone          STRING,    -- required: full phone (server reduces to last4)
    p_user_uid       STRING DEFAULT NULL,
    p_village        STRING DEFAULT NULL,
    p_aadhaar_last4  STRING DEFAULT NULL,
    p_aadhaar_ref    STRING DEFAULT NULL,
    p_lat            FLOAT8 DEFAULT NULL,
    p_lng            FLOAT8 DEFAULT NULL,
    p_user_agent_hash STRING DEFAULT NULL,
    p_assign_batch   BOOL DEFAULT TRUE
) RETURNS TABLE (
    sign_hash   STRING,
    batch_no    INT,
    is_dup      BOOL,
    verify_url  STRING
) AS $$
DECLARE
    new_hash    STRING;
    new_batch   INT;
    dup_hash    STRING;
BEGIN
    -- Duplicate protection: one signature per resident identity.
    IF p_user_uid IS NOT NULL THEN
        SELECT s.sign_hash INTO dup_hash
        FROM petition_signs s WHERE s.user_uid = p_user_uid
        ORDER BY s.created_at DESC LIMIT 1;
    ELSIF p_gdr_id IS NOT NULL THEN
        SELECT s.sign_hash INTO dup_hash
        FROM petition_signs s WHERE s.gdr_id = p_gdr_id
        ORDER BY s.created_at DESC LIMIT 1;
    END IF;

    IF dup_hash IS NOT NULL THEN
        -- Already signed — return the existing hash (idempotent).
        SELECT s.sign_hash, s.batch_no INTO new_hash, new_batch
        FROM petition_signs s WHERE s.sign_hash = dup_hash;
        RETURN QUERY SELECT new_hash AS sign_hash, new_batch AS batch_no, TRUE AS is_dup,
            format('/verify-sign?hash=%s', new_hash) AS verify_url;
        RETURN;
    END IF;

        -- Generate verification hash SERVER-SIDE: VG-<hex>.
    new_hash := 'VG-' || encode(gen_random_bytes(16), 'hex');

    -- Assign / extend batch atomically if requested.
    IF p_assign_batch THEN
        BEGIN
            SELECT batch_no INTO new_batch
            FROM petition_batches ORDER BY batch_no DESC LIMIT 1;
            IF new_batch IS NULL THEN
                new_batch := 1;
                INSERT INTO petition_batches(batch_no, start_hash, end_hash, sign_count)
                VALUES(new_batch, new_hash, new_hash, 1);
            ELSE
                UPDATE petition_batches
                SET end_hash = new_hash, sign_count = sign_count + 1
                WHERE batch_no = new_batch;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            new_batch := next_petition_batch();
            INSERT INTO petition_batches(batch_no, start_hash, end_hash, sign_count)
            VALUES(new_batch, new_hash, new_hash, 1);
        END;
    ELSE
        new_batch := 1;
    END IF;

    -- Extract last4 of phone (PI minimization) — strip non-digits.
    IF p_phone IS NOT NULL THEN
        p_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    END IF;

    INSERT INTO petition_signs (
        sign_hash, user_uid, gdr_id, full_name, village,
        phone_last4, aadhaar_last4, aadhaar_ref,
        latitude, longitude, user_agent_hash, batch_no
    ) VALUES (
        new_hash, p_user_uid, p_gdr_id, p_full_name, p_village,
        CASE WHEN p_phone IS NOT NULL AND length(p_phone) >= 4
            THEN right(p_phone, 4) ELSE NULL END,
        p_aadhaar_last4, p_aadhaar_ref,
        p_lat, p_lng, p_user_agent_hash, new_batch
    );

    RETURN QUERY SELECT new_hash AS sign_hash, new_batch AS batch_no, FALSE AS is_dup,
        format('/verify-sign?hash=%s', new_hash) AS verify_url;
END;
$$ LANGUAGE plpgsql;

-- Verification (independent of signing request). Public proof fields only.
CREATE OR REPLACE FUNCTION verify_petition_sign(p_sign_hash STRING)
RETURNS TABLE (
    sign_hash  STRING,
    full_name  STRING,
    village    STRING,
    batch_no   INT,
    signed_at  TIMESTAMPTZ,
    verified   BOOL
) AS $$
DECLARE
    _sign_hash  STRING;
    _full_name  STRING;
    _village    STRING;
    _batch_no   INT;
    _created_at TIMESTAMPTZ;
BEGIN
    SELECT s.sign_hash, s.full_name, s.village, s.batch_no, s.created_at
    INTO _sign_hash, _full_name, _village, _batch_no, _created_at
    FROM petition_signs s
    WHERE s.sign_hash = p_sign_hash
    ORDER BY s.created_at DESC LIMIT 1;

    IF _sign_hash IS NULL THEN
        RETURN QUERY SELECT NULL::STRING, NULL::STRING, NULL::STRING,
                       NULL::INT, NULL::TIMESTAMPTZ, FALSE;
    ELSE
        RETURN QUERY SELECT _sign_hash, _full_name, _village,
                       _batch_no, _created_at, TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Officials: list all signs in a batch (requires official role — enforced
-- server-side via requireRole('approved-official')).
CREATE OR REPLACE FUNCTION official_signs_view(p_batch_no INT DEFAULT NULL)
RETURNS TABLE (
    sign_hash  STRING,
    gdr_id     STRING,
    full_name  STRING,
    village    STRING,
    batch_no   INT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.sign_hash, s.gdr_id, s.full_name, s.village, s.batch_no, s.created_at
    FROM petition_signs s
    WHERE (p_batch_no IS NULL OR s.batch_no = p_batch_no)
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

