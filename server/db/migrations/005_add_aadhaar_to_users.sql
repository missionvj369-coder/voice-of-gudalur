-- =====================================================================
-- Migration 005 — Add Aadhaar verification columns to users
-- The register flow (authService.ts) INSERTs aadhaar_verified/last4/ref
-- into users, and the auth routes SELECT them — but the base schema
-- (001) never defined them. This migration backfills the columns.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS aadhaar_verified BOOL NOT NULL DEFAULT FALSE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS aadhaar_last4 STRING;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS aadhaar_ref STRING;

-- Index for lookup by Aadhaar reference (used in petition signing flow).
CREATE INDEX IF NOT EXISTS users_aadhaar_ref_idx ON users(aadhaar_ref) WHERE aadhaar_ref IS NOT NULL;
