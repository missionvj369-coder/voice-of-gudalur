-- =====================================================================
-- Migration 015 — Maintained petition statistics aggregate
-- Replaces COUNT(*) on petition_signs for the sign-stats endpoint.
-- The public sign-stats read hits this lightweight table every 6s TTL
-- window instead of scanning the full petition_signs table.
-- =====================================================================

CREATE TABLE IF NOT EXISTS petition_stats (
    id              STRING PRIMARY KEY DEFAULT 'global',
    signature_count INT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Seed the single global row idempotently.
INSERT INTO petition_stats (id, signature_count, updated_at)
VALUES ('global', 0, now())
ON CONFLICT (id) DO NOTHING;

-- Backfill: set the maintained count to the authoritative value.
UPDATE petition_stats
SET signature_count = (SELECT COUNT(*) FROM petition_signs),
    updated_at = now()
WHERE id = 'global';

-- Trigger: increment the maintained counter on every new signature.
-- Fires AFTER INSERT for new rows only (duplicates are rejected by
-- UNIQUE constraints before this trigger runs).
-- NOTE: CockroachDB has no CREATE TRIGGER IF NOT EXISTS — DROP+CREATE is the
-- idempotent pattern here (the runner tracks applied migrations anyway).
CREATE OR REPLACE FUNCTION petition_stats_increment() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO petition_stats (id, signature_count, updated_at)
        VALUES ('global', 1, now())
        ON CONFLICT (id) DO UPDATE
          SET signature_count = petition_stats.signature_count + 1,
              updated_at = now();
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS petition_stats_after_insert ON petition_signs;
CREATE TRIGGER petition_stats_after_insert
AFTER INSERT ON petition_signs
FOR EACH ROW EXECUTE FUNCTION petition_stats_increment();

-- Index for the ledger endpoint (ORDER BY created_at DESC LIMIT 500).
CREATE INDEX IF NOT EXISTS petition_signs_created_idx ON petition_signs(created_at DESC);

-- Index for cursor-based pagination on petition_signs (replaces OFFSET for large tables).
CREATE INDEX IF NOT EXISTS petition_signs_user_uid_created_idx ON petition_signs(user_uid, created_at DESC);

-- Index for the per-place leaderboard (village GROUP BY).
CREATE INDEX IF NOT EXISTS petition_signs_village_idx ON petition_signs(village) WHERE village IS NOT NULL AND village <> '';

-- Index for external_supports by created_at (for future leaderboard).
CREATE INDEX IF NOT EXISTS external_supports_created_idx ON external_supports(created_at DESC);
