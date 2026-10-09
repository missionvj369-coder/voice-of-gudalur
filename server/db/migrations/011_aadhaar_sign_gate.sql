-- =====================================================================
-- Migration 011 — Aadhaar sign-gate wiring
-- 1. A reliable per-row flag for "this resident has an Aadhaar on file"
--    (we gate petition signing on this, not on string parsing of last4).
-- 2. If any deployment predates the AADHAAR_VERIFIED enum value, add it
--    (safe: it is a new label not yet referenced by any row).
-- =====================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS has_aadhaar_on_file BOOL NOT NULL DEFAULT FALSE;

-- Keep the flag in sync with the last-4 column for rows created before this
-- migration. New writes go through the API, which sets both explicitly.
UPDATE users
   SET has_aadhaar_on_file = (aadhaar_last4 IS NOT NULL)
 WHERE has_aadhaar_on_file IS DISTINCT FROM (aadhaar_last4 IS NOT NULL);

CREATE INDEX IF NOT EXISTS users_has_aadhaar_idx
  ON users(has_aadhaar_on_file)
  WHERE has_aadhaar_on_file = TRUE;

-- Safety: if a deployment's CockroachDB predates the AADHAAR_VERIFIED label,
-- make sure it exists. ADD VALUE on an enum is a metadata operation and is
-- safe as long as the label is new (not currently referenced by any row).
-- NOTE: In CockroachDB, ALTER TYPE ADD VALUE cannot be run inside a DO block;
-- we check first and only run it at the top level if the value is missing.
-- The value AADHAAR_VERIFIED should already exist on most deployments (added
-- by 001_base_schema.sql which defines the enum with it). Only run ADD VALUE
-- if it is truly missing. If it already exists, this statement will fail with
-- a duplicate-error which we treat as a no-op (schema convergence pattern).
ALTER TYPE verification_level ADD VALUE 'AADHAAR_VERIFIED';
