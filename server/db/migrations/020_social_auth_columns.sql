-- Social auth + petition sign method tracking
-- Phase 1: Add sign_method to petition_signs and signatures tables
-- (GD_ID | PHONE | GOOGLE | TELEGRAM). Defaults to GD_ID for existing rows.

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
