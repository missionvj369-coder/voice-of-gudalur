-- =====================================================================
-- Migration 014 — External support validation backstops
-- Adds DB-level CHECK constraints mirroring the API-level validation in
-- server/routes/petitions.ts (name 1-100, email <=254, place <=100,
-- pincode <=6 chars, message <=500). 013 was applied without them, so
-- they are added here. Idempotent: each constraint is dropped first if
-- it already exists, making the migration safe to re-run.
-- =====================================================================

ALTER TABLE external_supports DROP CONSTRAINT IF EXISTS external_supports_name_check;
ALTER TABLE external_supports ADD CONSTRAINT external_supports_name_check CHECK (char_length(name) BETWEEN 1 AND 100);

ALTER TABLE external_supports DROP CONSTRAINT IF EXISTS external_supports_email_check;
ALTER TABLE external_supports ADD CONSTRAINT external_supports_email_check CHECK (email IS NULL OR char_length(email) <= 254);

ALTER TABLE external_supports DROP CONSTRAINT IF EXISTS external_supports_place_check;
ALTER TABLE external_supports ADD CONSTRAINT external_supports_place_check CHECK (place IS NULL OR char_length(place) <= 100);

ALTER TABLE external_supports DROP CONSTRAINT IF EXISTS external_supports_pincode_check;
ALTER TABLE external_supports ADD CONSTRAINT external_supports_pincode_check CHECK (pincode IS NULL OR char_length(pincode) BETWEEN 1 AND 6);

ALTER TABLE external_supports DROP CONSTRAINT IF EXISTS external_supports_message_check;
ALTER TABLE external_supports ADD CONSTRAINT external_supports_message_check CHECK (message IS NULL OR char_length(message) <= 500);