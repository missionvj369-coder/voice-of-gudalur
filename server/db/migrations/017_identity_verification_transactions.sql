-- =====================================================================
-- Migration 017 — Open Civic Signature Protocol: identity verification
-- transactions.
--
-- A verification transaction is a short-lived, single-use record that tracks
-- the lifecycle of an identity verification:
--
--   CREATED → STARTED → VERIFIED → CONSUMED
--                    ↘ FAILED / EXPIRED
--
-- Replay/reuse protection is enforced by the engine (a VERIFIED transaction
-- may be consumed at most once) AND by the schema (CONSUMED is terminal).
--
-- PRIVACY FIRST:
--   * raw provider subject (phone/MSISDN) is NEVER stored.
--   * identity_key_hash = HMAC-SHA-256(VERIFICATION_IDENTITY_SECRET,
--     domain:canonical_subject) is the only subject-derived value.
--   * result_reference is a non-reversible integrity marker over the raw
--     provider payload, allowing audit without storing the payload.
--   * request_id and ip hash are correlation-only metadata.
-- =====================================================================

CREATE TABLE IF NOT EXISTS identity_verification_transactions (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_ref   STRING      NOT NULL,
    -- provider: 'self-asserted' | 'camara' | 'turnstile'
    provider          STRING      NOT NULL,
    -- CREATED | STARTED | VERIFIED | FAILED | EXPIRED | CONSUMED
    state             STRING      NOT NULL DEFAULT 'CREATED',
    -- assurance level achieved/requested (0..4) — never implies a unique human
    assurance_level   INT         NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ NOT NULL,
    consumed_at       TIMESTAMPTZ,
    verified_at       TIMESTAMPTZ,
    request_id        STRING,
    provider_ref      STRING,
    identity_key_hash STRING,
    result_reference  STRING,
    error_code        STRING,
    client_ip_hash    STRING,
    user_agent_hash   STRING,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT identity_verification_tx_ref_unique UNIQUE (transaction_ref),
    CONSTRAINT identity_verification_tx_state_valid CHECK (
        state IN ('CREATED','STARTED','VERIFIED','FAILED','EXPIRED','CONSUMED')
    ),
    CONSTRAINT identity_verification_tx_assurance_valid CHECK (
        assurance_level BETWEEN 0 AND 4
    )
);

-- Lookup by privacy key (duplicate pre-check / audit).
CREATE INDEX IF NOT EXISTS identity_verification_tx_ikh_idx
    ON identity_verification_transactions(identity_key_hash);

-- Expiry sweeps.
CREATE INDEX IF NOT EXISTS identity_verification_tx_expiry_idx
    ON identity_verification_transactions(state, expires_at)
    WHERE state IN ('CREATED','STARTED');

-- Recent verification events (admin/audit).
CREATE INDEX IF NOT EXISTS identity_verification_tx_created_idx
    ON identity_verification_transactions(created_at DESC);