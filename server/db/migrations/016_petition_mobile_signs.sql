-- =====================================================================
-- Migration 016 — Public Name+Mobile petition signing (petition-only launch)
--
-- ONE MOBILE NUMBER = ONE PETITION SIGNATURE.
-- Uniqueness is enforced BY THE DATABASE via
--   UNIQUE (petition_id, mobile_identity_hash)
-- where mobile_identity_hash = HMAC-SHA256(PETITION_IDENTITY_SECRET, normalized
-- 10-digit national mobile). The raw mobile is NEVER stored; only phone_last4
-- (display) and the HMAC (lookup/uniqueness) are persisted.
--
-- The SELECT→INSERT pattern alone is racy: two simultaneous requests can both
-- see "not found" and both insert. Here the UNIQUE constraint is the
-- authority; the API layer treats error 23505 as a duplicate (idempotent).
--
-- These public signatures are counted in the SAME maintained petition_stats
-- aggregate as resident signatures (trigger below), so the live public count
-- stays one authoritative number and keeps reading from the aggregate
-- (no COUNT(*) on hot paths).
-- =====================================================================

CREATE TABLE IF NOT EXISTS petition_mobile_signs (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    petition_id          STRING      NOT NULL DEFAULT 'global',
    sign_hash            STRING      NOT NULL,
    mobile_identity_hash STRING      NOT NULL,
    full_name            STRING      NOT NULL,
    phone_last4          STRING,
    user_agent_hash      STRING,
    batch_no             INT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- THE core integrity rule: one signature per (petition, mobile identity).
    CONSTRAINT petition_mobile_signs_identity_unique UNIQUE (petition_id, mobile_identity_hash),
    -- Verification hashes are unique across ALL signature kinds.
    CONSTRAINT petition_mobile_signs_hash_unique UNIQUE (sign_hash)
);

-- Public ledger reads the most recent signatures (ORDER BY created_at DESC LIMIT 500).
CREATE INDEX IF NOT EXISTS petition_mobile_signs_created_idx
    ON petition_mobile_signs(created_at DESC);

-- Trigger: public mobile signatures increment the SAME maintained aggregate
-- row that resident signatures use, so /api/petitions/sign-stats (which reads
-- petition_stats) automatically includes them with zero extra queries.
CREATE OR REPLACE FUNCTION petition_stats_increment_mobile() RETURNS TRIGGER AS $$
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

DROP TRIGGER IF EXISTS petition_mobile_stats_after_insert ON petition_mobile_signs;
CREATE TRIGGER petition_mobile_stats_after_insert
AFTER INSERT ON petition_mobile_signs
FOR EACH ROW EXECUTE FUNCTION petition_stats_increment_mobile();

-- Backfill: the aggregate must equal resident signs + public mobile signs.
UPDATE petition_stats
SET signature_count = (SELECT COUNT(*) FROM petition_signs)
                    + (SELECT COUNT(*) FROM petition_mobile_signs),
    updated_at = now()
WHERE id = 'global';
