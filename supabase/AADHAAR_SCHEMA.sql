-- ==================================================================
-- AADHAAR VERIFICATION COLUMNS (pyaadhaar integration)
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
--
-- PRIVACY: the full 12-digit Aadhaar number is NEVER stored, logged
-- or transmitted by this platform. Only:
--   aadhaar_verified : did pyaadhaar verify this resident?
--   aadhaar_last4    : masked reference (••••1234)
--   aadhaar_ref      : UIDAI referenceid (secure QR) or 'CHKSUM-OK'
--                      (12-digit number passing the UIDAI Verhoeff check)
-- ==================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS aadhaar_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aadhaar_last4    TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_ref      TEXT;

-- Residents may update their own verification columns through the app's
-- registration upsert path (insert-only is already granted).
GRANT SELECT, INSERT, UPDATE ON users TO anon, authenticated;
