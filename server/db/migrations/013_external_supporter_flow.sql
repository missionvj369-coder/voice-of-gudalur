-- =====================================================================
-- Migration 013 — External supporter flow
-- Enables non-Gudalur people to support the movement without becoming
-- registered residents. No Aadhaar required. No Gudalur ID issued.
-- These supports are counted SEPARATELY from resident petition signatures.
-- =====================================================================

-- Normalized table for external (non-resident) supporters.
-- No auth required. Deduplicated by (petition_id, email).
-- DB-level CHECK backstops for API validation live in 014 (this table
-- predates them and 013 is already applied in existing environments).
CREATE TABLE IF NOT EXISTS external_supports (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    petition_id UUID    NOT NULL REFERENCES petitions(id) ON DELETE CASCADE,
    name        STRING    NOT NULL,
    email       STRING,
    place       STRING,
    pincode     STRING,
    message     STRING,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- One support per email per petition (NULL email allowed for anonymous, no dedupe)
    UNIQUE (petition_id, email)
);

CREATE INDEX IF NOT EXISTS external_supports_petition_idx ON external_supports(petition_id);
CREATE INDEX IF NOT EXISTS external_supports_created_idx ON external_supports(created_at DESC);

-- Separate counter for external supports (distinct from resident support_count).
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS external_support_count INT NOT NULL DEFAULT 0;
