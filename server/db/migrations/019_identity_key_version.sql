-- =====================================================================
-- Migration 019 — Identity key versioning for HMAC key rotation.
--
-- Adds identity_key_version to petition_mobile_signs and
-- identity_verification_transactions so that duplicate detection
-- remains valid across HMAC key rotations.
--
-- The active version is controlled by VERIFICATION_KEY_VERSION env.
-- Historical versions are verified using VERIFICATION_IDENTITY_SECRET_V<n>.
-- =====================================================================

ALTER TABLE petition_mobile_signs ADD COLUMN IF NOT EXISTS identity_key_version INT NOT NULL DEFAULT 1;
ALTER TABLE identity_verification_transactions ADD COLUMN IF NOT EXISTS identity_key_version INT NOT NULL DEFAULT 1;

-- Index for duplicate detection across key versions.
CREATE INDEX IF NOT EXISTS petition_mobile_signs_identity_version_idx
    ON petition_mobile_signs(petition_id, mobile_identity_hash, identity_key_version);

-- Index for verification transaction lookups by version.
CREATE INDEX IF NOT EXISTS identity_verification_tx_version_idx
    ON identity_verification_transactions(identity_key_hash, identity_key_version)
    WHERE identity_key_hash IS NOT NULL;
