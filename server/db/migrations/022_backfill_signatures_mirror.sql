-- =====================================================================
-- Migration 022 — Backfill the civic `signatures` mirror table
--
-- The Open Validation (witness) flow reads and writes the `signatures`
-- table, but petition signing historically wrote ONLY to petition_signs.
-- No signature therefore ever had a validation row, so
-- POST /api/validation/create always answered 404
-- ("Signature not found or not owned by you") and the witness-validation
-- feature was unreachable from the UI.
--
-- recordPetitionSign now mirrors every new signature into `signatures`
-- inside the same transaction. This migration backfills the signatures
-- created BEFORE that change so existing signers can mint a witness link.
--
-- Idempotent: `public_reference` is UNIQUE and rows that already exist are
-- skipped, so re-running this migration (or running it on a fresh
-- database) is a no-op.
-- =====================================================================

INSERT INTO signatures
  (petition_id, identity_id, public_reference, public_display_mode,
   display_name, area, status, signed_at, sign_method, unicode_sort_key)
SELECT
  'global',
  -- identity_id must equal the session uid the owner signs in with, so
  -- POST /api/validation/create can prove ownership. Fall back to the gdr_id
  -- and finally the sign hash for legacy rows with no uid.
  COALESCE(NULLIF(ps.user_uid, ''), NULLIF(ps.gdr_id, ''), ps.sign_hash),
  ps.sign_hash,
  'community',
  ps.full_name,
  ps.village,
  'PENDING',
  ps.created_at,
  COALESCE(NULLIF(ps.sign_method, ''), 'GD_ID'),
  100
FROM petition_signs ps
WHERE ps.sign_hash IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM signatures s WHERE s.public_reference = ps.sign_hash
  );

COMMENT ON COLUMN signatures.public_display_mode IS
  'How the signer is shown to a witness: anonymous | community';
