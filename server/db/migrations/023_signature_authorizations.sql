-- =====================================================================
-- Migration 023 — Signature authorizations (Google / Telegram)
--
-- Social sign-in never creates an account (see routes/auth.ts#findSocialResident):
-- Google and Telegram belong to a resident who ALREADY registered, and they are
-- used to strengthen a signature that has already been made. This table is where
-- that happens — a signed petition can be AUTHORIZED after the fact by
-- authenticating a provider the signer already owns:
--
--   google   → the signer controls a Google account      (identity authentication)
--   telegram → the signer controls the mobile number on their Telegram account
--              (mobile-number validation; only counted when the number shared
--               with the bot matches the number on the resident record)
--
-- A signature authorized by BOTH providers **and** carrying a community witness
-- validation is a FULLY VALIDATED petition. The public "higher = more trusted"
-- ranking (`unicode_sort_key`) is derived from this table by
-- server/db/trustRanking.ts — the single source of truth used by BOTH the
-- witness-accept path and the authorization path, so one can never downgrade
-- what the other raised.
--
-- Privacy (CIVIC_SIGNATURE_PROTOCOL.md §10): only a keyed hash of the provider
-- subject is stored — never the raw Google `sub`, the Telegram id, or a phone
-- number. `subject_label` holds a MASKED display hint only.
-- =====================================================================

CREATE TABLE IF NOT EXISTS signature_authorizations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- UUID to match signatures.id. Deliberately NOT STRING: migration 020
    -- declared validation_links.signature_id as STRING while signatures.id is
    -- UUID, and that drift forces ::STRING casts on every join. New tables do
    -- not repeat it. (Queries still cast both sides — see trustRanking.ts — so
    -- this survives a database whose signatures.id drifted the other way.)
    signature_id  UUID        NOT NULL,
    provider      STRING      NOT NULL,
    -- sha256("authorization:<provider>:<subject>:<secret>") — see
    -- server/security/vouTokens.ts#generateProviderSubjectKey
    subject_hash  STRING      NOT NULL,
    -- Masked hint for the resident's own UI (e.g. "v***@gmail.com", "@handle").
    subject_label STRING,
    -- Telegram only: the number shared with the bot matched the registered number.
    phone_matched BOOL        NOT NULL DEFAULT false,
    authorized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_signature_authorization_provider CHECK (provider IN ('google','telegram'))
);

CREATE UNIQUE INDEX IF NOT EXISTS signature_authorizations_signature_provider_uk
    ON signature_authorizations(signature_id, provider);
CREATE INDEX IF NOT EXISTS signature_authorizations_signature_idx
    ON signature_authorizations(signature_id);

COMMENT ON TABLE signature_authorizations IS 'Post-signature provider authorizations: google = identity authentication, telegram = mobile-number validation';
COMMENT ON COLUMN signature_authorizations.subject_hash IS 'Keyed hash of the provider subject — the raw Google sub / Telegram id is never stored';
COMMENT ON COLUMN signature_authorizations.phone_matched IS 'Telegram only: the shared mobile number matched the number on the resident record';