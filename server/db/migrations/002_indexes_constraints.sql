-- =====================================================================
-- Migration 002 — Indexes, constraints, and authoritative aggregates
-- Replaces the broken client-side counter pattern that caused the
-- manifesto_stats drift (count=6 vs signatures=7). Counts are now
-- derived from authoritative tables via a trigger kept in sync at
-- write time (single source of truth: manifesto_signatures).
-- =====================================================================

-- All indexes for base tables (001 had a few inline; this centralizes them).
CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone);
CREATE INDEX IF NOT EXISTS users_gudalur_id_idx ON users(gudalur_id);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS petition_signs_gdr_id_idx ON petition_signs(gdr_id);
CREATE INDEX IF NOT EXISTS manifesto_signatures_created_idx ON manifesto_signatures(created_at DESC);
CREATE INDEX IF NOT EXISTS manifesto_submissions_created_idx ON manifesto_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS wildlife_incidents_loc_idx ON wildlife_incidents(locality_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wildlife_incidents_ts_idx ON wildlife_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS animal_sightings_created_idx ON animal_sightings(created_at DESC);
CREATE INDEX IF NOT EXISTS animal_sightings_latlng_idx ON animal_sightings(latitude, longitude);
CREATE INDEX IF NOT EXISTS voice_petitions_created_idx ON voice_petitions(created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_active_idx ON alerts(active, starts_at) WHERE active = true;
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_uid);
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_uk ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS push_log_status_idx ON push_log(status);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS audit_events_action_idx ON audit_events(action, created_at DESC);
CREATE INDEX IF NOT EXISTS sync_idempotency_kind_idx ON sync_idempotency(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS petitions_status_idx ON petitions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS petitions_support_idx ON petitions(support_count DESC);
CREATE INDEX IF NOT EXISTS petition_batches_forwarded_idx ON petition_batches(forwarded_marker, forwarded_at);

-- Seed the single 'global' stats row idempotently.
INSERT INTO manifesto_stats (id, signature_count, submission_count, last_updated)
VALUES ('global', 0, 0, now())
ON CONFLICT (id) DO UPDATE SET last_updated = EXCLUDED.last_updated;

-- Ensure manifesto_stats always matches authoritative sources.
-- This trigger fires per-row on manifesto_signatures insert/delete (the
-- signature count is the source of truth for the manifesto endorsement number).
CREATE OR REPLACE FUNCTION manifesto_signature_audit() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO manifesto_stats (id, signature_count, submission_count, last_updated)
    VALUES ('global', 1, 0, now())
    ON CONFLICT (id) DO UPDATE
      SET signature_count = manifesto_stats.signature_count + 1,
          last_updated = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE manifesto_stats SET signature_count = signature_count - 1,
      last_updated = now() WHERE id = 'global';
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manifesto_signature_audit
AFTER INSERT OR DELETE ON manifesto_signatures
FOR EACH ROW EXECUTE FUNCTION manifesto_signature_audit();

-- Recompute submission count from the authoritative manifesto_submissions table.
CREATE OR REPLACE FUNCTION refresh_manifesto_submission_count() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO manifesto_stats (id, signature_count, submission_count, last_updated)
  VALUES ('global', 0, 1, now())
  ON CONFLICT (id) DO UPDATE
    SET submission_count = (SELECT count(*) FROM manifesto_submissions),
        last_updated = now();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manifesto_submission_audit
AFTER INSERT OR DELETE ON manifesto_submissions
FOR EACH ROW EXECUTE FUNCTION refresh_manifesto_submission_count();

-- One-time backfill: set signature_count/submission_count to actual counts
-- (this is what fixes the existing drift for migrated data).
UPDATE manifesto_stats
SET signature_count = (SELECT count(*) FROM manifesto_signatures),
    submission_count = (SELECT count(*) FROM manifesto_submissions),
    last_updated = now()
WHERE id = 'global';

-- updated_at auto-touch for users.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_touch_updated ON users;
CREATE TRIGGER users_touch_updated BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
