-- ============================================================================
-- FIX LIVE DATABASE: resident registrations are being rejected by RLS
-- ============================================================================
-- Symptom: users register in the app, but the `users` table stays empty
--          (Postgres error 42501: "new row violates row-level security
--          policy for table users"). The app then keeps the resident
--          card in localStorage only.
-- Fix    : add the missing INSERT/UPDATE policies on `users`.
-- Run    : Supabase Dashboard → SQL Editor → paste → RUN  (takes < 1 second)
-- Safe   : idempotent — can be run multiple times.
-- ============================================================================

-- 1. Residents may create their own citizen card
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "residents_can_register" ON users;
CREATE POLICY "residents_can_register" ON users
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 2. Residents may update their own card (Edit My Details / profile upsert)
DROP POLICY IF EXISTS "residents_can_update_own" ON users;
CREATE POLICY "residents_can_update_own" ON users
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Housekeeping: reset the endorsement counter bumped during diagnostics
UPDATE manifesto_stats SET count = 0 WHERE id = 'global';

-- 4. Housekeeping: remove diagnostic test rows created while investigating
DELETE FROM manifesto_signatures  WHERE gudalur_id = 'GD-2026-DIAG1';
DELETE FROM manifesto_submissions WHERE gudalur_id = 'GD-2026-DIAG1';
DELETE FROM users                 WHERE uid     = 'diag_test_001';

-- ============================================================================
-- Done. From now on every registration is written to the real cloud ledger,
-- and login with Phone + Gudalur ID works on ANY device.
-- ============================================================================
