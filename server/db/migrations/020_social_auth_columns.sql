-- Social auth + petition sign method tracking
-- Phase 1: Add sign_method to petition_signs and signatures tables
-- (GD_ID | PHONE | GOOGLE | TELEGRAM). Defaults to GD_ID for existing rows.

-- Phase 0: Ensure the civic-signature validation tables exist. These are the
-- tables the Express validation system (server/routes/validation.ts) reads and
-- writes. They were never created by an earlier migration, which made this
-- migration (and 021) fail on any fresh or production database with
-- relation "signatures" does not exist. They are defined idempotently here so
-- the ALTER TABLE statements below always have a target.
-- ---------------------------------------------------------------------
-- Phase 0a: signatures (one row per petition signature awaiting validation)
CREATE TABLE IF NOT EXISTS signatures (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    petition_id         STRING      NOT NULL DEFAULT '',
    identity_id         STRING      NOT NULL,
    public_reference    STRING      UNIQUE,
    public_display_mode STRING      NOT NULL DEFAULT 'anonymous',
    display_name        STRING,
    area                STRING,
    -- PENDING | COMMUNITY_VALIDATED | REVIEW_REQUIRED
    status              STRING      NOT NULL DEFAULT 'PENDING',
    signed_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT now() NOT NULL
);
-- Phase 0b: validation_links (single-use witness invitation tokens)
CREATE TABLE IF NOT EXISTS validation_links (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    signature_id STRING      NOT NULL,
    token_hash   STRING      NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ NOT NULL,
    -- active | used | revoked
    status       STRING      NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
    used_at      TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS validation_links_signature_idx ON validation_links(signature_id);
CREATE INDEX IF NOT EXISTS validation_links_status_created_idx ON validation_links(status, created_at);
-- Phase 0c: validation_witnesses (who confirmed a signature)
CREATE TABLE IF NOT EXISTS validation_witnesses (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_link_id   STRING      NOT NULL,
    signature_id         STRING      NOT NULL,
    witness_identity_id  STRING      NOT NULL,
    idempotency_key      STRING,
    created_at           TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS validation_witnesses_link_witness_uk
    ON validation_witnesses(validation_link_id, witness_identity_id);
CREATE UNIQUE INDEX IF NOT EXISTS validation_witnesses_idem_key_uk
    ON validation_witnesses(idempotency_key)
    WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS validation_witnesses_signature_idx ON validation_witnesses(signature_id);
-- ---------------------------------------------------------------------

-- Phase 1a: petition_signs columns
-- Phase 1a: petition_signs columns
ALTER TABLE petition_signs ADD COLUMN IF NOT EXISTS sign_method TEXT NOT NULL DEFAULT 'GD_ID';
ALTER TABLE petition_signs ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE petition_signs ADD COLUMN IF NOT EXISTS unicode_sort_key FLOAT8;
ALTER TABLE petition_signs ADD COLUMN IF NOT EXISTS validation_count INT NOT NULL DEFAULT 0;
ALTER TABLE petition_signs ADD COLUMN IF NOT EXISTS max_validations INT NOT NULL DEFAULT 3;

-- Phase 1b: signatures table (used by validation system) columns
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS validation_count INT NOT NULL DEFAULT 0;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS max_validations INT NOT NULL DEFAULT 3;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS sign_method TEXT NOT NULL DEFAULT 'GD_ID';
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS unicode_sort_key FLOAT8;

-- Phase 2: Social login consent tracking
CREATE TABLE IF NOT EXISTS social_consent_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uid        STRING NOT NULL,
    provider        STRING NOT NULL,
    consented_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip              STRING,
    user_agent      STRING,
    CONSTRAINT chk_social_provider CHECK (provider IN ('google','telegram'))
);
CREATE INDEX IF NOT EXISTS idx_social_consent_user ON social_consent_log(user_uid, provider);

-- Update existing rows to have correct defaults
UPDATE petition_signs SET sign_method = 'GD_ID' WHERE sign_method IS NULL OR sign_method = '';
UPDATE petition_signs SET consent_timestamp = created_at WHERE consent_timestamp IS NULL;
UPDATE petition_signs SET validation_count = 0 WHERE validation_count IS NULL;
UPDATE petition_signs SET max_validations = 3 WHERE max_validations IS NULL;

COMMENT ON COLUMN petition_signs.sign_method IS 'How signature was made: GD_ID | PHONE | GOOGLE | TELEGRAM';
COMMENT ON COLUMN petition_signs.consent_timestamp IS 'When user gave explicit consent to sign via selected method';
COMMENT ON COLUMN petition_signs.validation_count IS 'Number of validations received (max 3)';
COMMENT ON COLUMN petition_signs.max_validations IS 'Maximum validations allowed per signature (currently 3)';
COMMENT ON COLUMN petition_signs.unicode_sort_key IS 'Sort priority key: higher = more trusted';
COMMENT ON COLUMN signatures.validation_count IS 'Number of validations received (max 3)';
COMMENT ON COLUMN signatures.max_validations IS 'Maximum validations allowed per signature (currently 3)';
COMMENT ON COLUMN signatures.sign_method IS 'How signature was made: GD_ID | PHONE | GOOGLE | TELEGRAM';
COMMENT ON COLUMN signatures.unicode_sort_key IS 'Sort priority key: higher = more trusted';
