-- =====================================================================
-- Migration 012 — Environment-based bootstrap, petition_supports, dead-function cleanup
-- =====================================================================
-- 1. Admin bootstrap: on fresh deployments migration 006 inserts the
--    PLATFORM_ADMIN row with a hash that was historically hardcoded in
--    migration comments / source.  The JS bootstrap in server/db/migrate.ts
--    now OVERWRITES password_hash from the ADMIN_BOOTSTRAP_PASSWORD_HASH
--    environment variable when it is set, so the credential lives ONLY in
--    the deployment environment (never in git).  If the env var is absent the
--    existing admin record is left untouched — no lock-out.
--
-- 2. petition_supports: authoritative per-resident support ledger that
--    replaces the unbounded `supporters_json` STRING column.  The column
--    remains in the schema for legacy compatibility but is no longer read
--    by any listing endpoint or mutated by the support flow.
--
-- 3. Drop dead PL/pgSQL functions from migrations 003 and 004.  All of them
--    are superseded by direct SQL in the JS repositories; no JS code or
--    external operational script calls `record_petition_sign`,
--    `verify_petition_sign`, `official_signs_view`, `next_petition_batch`,
--    `upsert_wildlife_incident`, or `add_animal_sighting`.
--    See DECISIONS.md §11 for the full audit rationale.
-- =====================================================================

-- ── 1. petition_supports: normalized support records ───────────────────
CREATE TABLE IF NOT EXISTS petition_supports (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    petition_id UUID    NOT NULL REFERENCES petitions(id) ON DELETE CASCADE,
    uid         STRING    NOT NULL,
    gudalur_id  STRING,
    full_name   STRING,
    locality    STRING,
    phone_last4 STRING,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- One support per resident per petition (authoritative dedupe key).
    UNIQUE (petition_id, uid)
);

CREATE INDEX IF NOT EXISTS petition_supports_petition_idx ON petition_supports(petition_id);
CREATE INDEX IF NOT EXISTS petition_supports_uid_idx     ON petition_supports(uid);

-- ── 2. Drop dead PL/pgSQL functions (proven unused by repository-wide search) ──
-- Drop in dependency order: record_petition_sign depends on next_petition_batch,
-- so drop record_petition_sign first. Use simple names (CockroachDB accepts
-- DROP FUNCTION with just the name when argument types are unambiguous).
DROP FUNCTION IF EXISTS record_petition_sign;
DROP FUNCTION IF EXISTS next_petition_batch;
DROP FUNCTION IF EXISTS verify_petition_sign;
DROP FUNCTION IF EXISTS official_signs_view;
DROP FUNCTION IF EXISTS upsert_wildlife_incident;
DROP FUNCTION IF EXISTS add_animal_sighting;

-- Index to support the new petition_supports-based aggregate count (kept in
-- the JS layer; created here so a fresh DB is query-ready immediately).
CREATE INDEX IF NOT EXISTS petition_supports_created_idx ON petition_supports(created_at DESC);
