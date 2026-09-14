-- =====================================================================
-- Migration 021 — One validation per signature
--
-- Per product decision: a single community validation is sufficient.
-- Reduces validation writes per signature (lower DB RU usage), flattens
-- the trust rank into validated / not-validated tiers, and simplifies
-- the civic signature protocol.
--
-- No validated signatures exist in production today, so the
-- validation_count > 1 capping UPDATEs below are safety no-ops — they
-- make the migration correct even if rows appear before it runs.
-- =====================================================================

-- New signatures default to one allowed validation.
ALTER TABLE petition_signs ALTER COLUMN max_validations SET DEFAULT 1;
ALTER TABLE signatures    ALTER COLUMN max_validations SET DEFAULT 1;

-- Existing rows conform to the new limit.
UPDATE petition_signs SET max_validations = 1;
UPDATE signatures    SET max_validations = 1;

-- Safety: never report more than one validation per signature.
UPDATE petition_signs SET validation_count = 1 WHERE validation_count > 1;
UPDATE signatures    SET validation_count = 1 WHERE validation_count > 1;

COMMENT ON COLUMN petition_signs.validation_count IS 'Number of validations received (max 1)';
COMMENT ON COLUMN petition_signs.max_validations IS 'Maximum validations allowed per signature (1)';
COMMENT ON COLUMN signatures.validation_count IS 'Number of validations received (max 1)';
COMMENT ON COLUMN signatures.max_validations IS 'Maximum validations allowed per signature (1)';