-- =====================================================================
-- Migration 009 — Pincode-based Gudalur/Outside split
-- The sign-stats endpoint splits signatures into "from Gudalur" vs
-- "outside Gudalur". Text-matching the free-text village column is fragile
-- (people type "Gudalur", "gudalur", "Gudalur Taluk", etc.). Pincode is the
-- reliable signal: Gudalur Taluk = 643201..643270. We capture the pincode at
-- sign time (from the resident's profile pincode, which they set at
-- registration or which we reverse-geocode from GPS) and use it for the
-- split. Also adds aadhaar_number to users for the Aadhaar-valid-sign rule.
-- =====================================================================

-- Pincode captured at petition-sign time (source of truth for the split).
ALTER TABLE petition_signs ADD COLUMN IF NOT EXISTS pincode STRING DEFAULT NULL;

-- Full Aadhaar number (encrypted at rest by the application layer) so a
-- signature can be a legally-valid proof. Optional at registration; the
-- resident can update it later from their profile. Only signatures whose
-- resident has an Aadhaar on file count as "Aadhaar-verified proof".
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_number STRING DEFAULT NULL;

-- Last 4 digits of Aadhaar — returned from server for display after update.
-- This allows the client to show a masked Aadhaar (XXXX-XXXX-1234) without
-- exposing the full number.
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_last4 STRING DEFAULT NULL;

-- Index for the pincode-based Gudalur/Outside split.
CREATE INDEX IF NOT EXISTS petition_signs_pincode_idx ON petition_signs(pincode) WHERE pincode IS NOT NULL;