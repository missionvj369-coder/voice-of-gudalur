-- Social auth: Google OAuth + Telegram Login Widget
-- Adds provider tracking so a resident can sign in via Google or Telegram
-- in addition to phone-based auth. One account = one uid regardless of method.

ALTER TABLE users ADD COLUMN IF NOT EXISTS provider STRING DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_subject STRING DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_email STRING DEFAULT '';

-- Index for fast lookup by provider + subject (the social login hot path)
CREATE INDEX IF NOT EXISTS idx_users_provider_subject ON users (provider, provider_subject) WHERE provider <> '';
CREATE INDEX IF NOT EXISTS idx_users_provider_email ON users (provider_email) WHERE provider_email <> '';
