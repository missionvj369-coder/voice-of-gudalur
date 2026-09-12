-- =====================================================================
-- Migration 018 — Open Civic Signature Protocol: civic signature columns.
--
-- Adds to the existing petition_mobile_signs table (migration 016):
--   * signature_hash      — server-generated cryptographic audit identifier
--                           (HMAC over canonical fields; NOT the uniqueness key)
--   * civic_sign_id       — short public anonymized identifier (VOG-AB12CD…)
--   * verification_tx_ref — reference to the consumed verification transaction
--   * provider            — provider that verified this identity
--   * assurance_level     — assurance level achieved (never implies unique human)
--
-- UNIQUENESS remains UNIQUE(petition_id, mobile_identity_hash) from migration
-- 016. This migration only ADDS protocol metadata; it never weakens 016.
-- =====================================================================

ALTER TABLE petition_mobile_signs ADD COLUMN IF NOT EXISTS signature_hash STRING;
ALTER TABLE petition_mobile_signs ADD COLUMN IF NOT EXISTS civic_sign_id STRING;
ALTER TABLE petition_mobile_signs ADD COLUMN IF NOT EXISTS verification_tx_ref STRING;
ALTER TABLE petition_mobile_signs ADD COLUMN IF NOT EXISTS provider STRING NOT NULL DEFAULT 'self-asserted';
ALTER TABLE petition_mobile_signs ADD COLUMN IF NOT EXISTS assurance_level INT NOT NULL DEFAULT 1;

-- Public identifiers are unique across all signatures.
CREATE UNIQUE INDEX IF NOT EXISTS petition_mobile_signs_civic_id_unique
    ON petition_mobile_signs(civic_sign_id)
    WHERE civic_sign_id IS NOT NULL;

-- Verification reference correlation for audit.
CREATE INDEX IF NOT EXISTS petition_mobile_signs_tx_ref_idx
    ON petition_mobile_signs(verification_tx_ref)
    WHERE verification_tx_ref IS NOT NULL;

-- Auditors can re-derive and compare signature_hashes.
CREATE INDEX IF NOT EXISTS petition_mobile_signs_sig_hash_idx
    ON petition_mobile_signs(signature_hash)
    WHERE signature_hash IS NOT NULL;