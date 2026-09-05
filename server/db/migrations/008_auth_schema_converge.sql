-- =====================================================================
-- Migration 008 — Auth schema convergence
-- The production database was created partially by hand BEFORE the
-- migration runner existed (a users row + GDR000000 admin existed while
-- `sessions` did not). This migration guarantees every table/column the
-- auth + registration flow needs exists, regardless of how the DB began.
-- Every statement is idempotent.
-- =====================================================================

-- Sessions: the login/registration session store (createSession writes here).
CREATE TABLE IF NOT EXISTS sessions (
    id                 UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id        STRING    NOT NULL,
    identity_kind      STRING    NOT NULL,
    refresh_token      STRING,
    refresh_token_hash STRING    NOT NULL,
    user_agent         STRING,
    ip                 STRING,
    role               STRING,
    created_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    CONSTRAINT chk_session_kind CHECK (identity_kind IN ('user','official'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_identity ON sessions(identity_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token_hash);

-- Locality lookup used by registration (registerResident resolves the name).
CREATE TABLE IF NOT EXISTS locality (
    id      STRING PRIMARY KEY,
    name    STRING NOT NULL,
    pincode STRING,
    lat     FLOAT8,
    lng     FLOAT8
);

-- Converge every users column the app reads/writes (hand-made tables may
-- predate several of these). ADD COLUMN IF NOT EXISTS is a no-op when the
-- column already exists.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email STRING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locality_id STRING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locality_name STRING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_place_name STRING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode STRING DEFAULT '643212';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role STRING NOT NULL DEFAULT 'LOCAL_MEMBER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_level STRING NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blood_donor BOOL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group STRING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url STRING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio STRING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lat FLOAT8;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lng FLOAT8;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_verified BOOL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_last4 STRING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_ref STRING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash STRING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS issues_reported INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS issues_supported INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS representations_created INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS alerts_acknowledged INT DEFAULT 0;

-- Unique phone index — the duplicate-registration guard relies on it.
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON users(phone);
CREATE INDEX IF NOT EXISTS users_gudalur_id_unique_idx ON users(gudalur_id);
