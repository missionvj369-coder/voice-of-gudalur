-- =====================================================================
-- Migration 006 — Official password authentication + admin system
-- Government officials log in with email + password (not OTP).
-- Admin (PLATFORM_ADMIN) manages official access at /admin.
-- =====================================================================

-- Backfill: live databases created from an earlier base schema predate the
-- users.password_hash column (001 was applied before it was added there).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash STRING;

-- Password storage for officials (email + password login)
ALTER TABLE officials
    ADD COLUMN IF NOT EXISTS password_hash STRING;

ALTER TABLE officials
    ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;

-- Password reset flow
ALTER TABLE officials
    ADD COLUMN IF NOT EXISTS reset_token STRING;

ALTER TABLE officials
    ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

-- Track who added the official (admin who granted access)
ALTER TABLE officials
    ADD COLUMN IF NOT EXISTS added_by STRING;

-- Index for reset token lookups
CREATE INDEX IF NOT EXISTS officials_reset_token_idx ON officials(reset_token) WHERE reset_token IS NOT NULL;

-- =====================================================================
-- Seed the PLATFORM_ADMIN user (GDR 000000).
-- Password: 18thDimension@369  (scrypt hash: salt:derived)
-- This is the master admin account; it cannot be created through the UI.
-- =====================================================================
INSERT INTO users (uid, phone, gudalur_id, name, email, role, verification_level, pincode, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '0000000000',
    'GDR000000',
    'Voice of Gudalur Admin',
    'soulconnect@ugtglobal.space',
    'PLATFORM_ADMIN',
    'AADHAAR_VERIFIED',
    '643212',
    'b14a4ee0f2a96ee6cc0e27d7f2e0124b:fd9fccb6f23aa39097f94b1606e6b1b65852895d25b9c68fe50c2fa58e5f0912dce55af6cd3289c04eddd7f9af20f9bafe8f46b74abaade8b5b782e6f391e1e1'
)
ON CONFLICT (uid) DO UPDATE SET
    gudalur_id = EXCLUDED.gudalur_id,
    role = EXCLUDED.role,
    verification_level = EXCLUDED.verification_level,
    password_hash = EXCLUDED.password_hash;
