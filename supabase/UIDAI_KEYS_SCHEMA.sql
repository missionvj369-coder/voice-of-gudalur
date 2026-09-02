-- ==================================================================
-- UIDAI_KEYS_SCHEMA.sql
-- Zero-release UIDAI Secure-QR signing-key rotation
-- (public.app_config -> key 'uidai_spki_keys').
--
-- WHY THIS EXISTS
--   UIDAI rotates its Offline PKI signing key every ~2 years. The keys
--   bundled in src/lib/uidaiPublicKeys.ts are pinned at build time and
--   BOTH have expired (2024-02-27 and 2026-02-16); UIDAI had not yet
--   published a successor cert when this file was written. Instead of
--   shipping a new release for every rotation, the app checks this table
--   once per registration session
--   (src/lib/uidaiPublicKeys.ts -> refreshUidaiKeysFromDb) and overlays
--   any keys published here on top of the bundled ones.
--
-- TO ROTATE (no release needed)
--   1. Drop the new UIDAI .pem into scripts/certs/ and run:
--        node scripts/extract-uidai-keys.mjs
--   2. update public.app_config
--        set value = '["<NEW-SPKI-BASE64>"]', updated_at = now()
--      where key = 'uidai_spki_keys';
--   Residents' devices pick it up on the next Aadhaar scan; the SHA-256
--   integrity check keeps protecting scans meanwhile.
--   Full runbook: docs/UIDAI_KEY_ROTATION.md
--
-- SECURITY: public keys are public, so anon SELECT is intended. There are
--   NO INSERT/UPDATE/DELETE policies below, so only the service_role key
--   can write. Never grant write to anon/authenticated on this table.
-- ==================================================================

create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "app_config is publicly readable" on public.app_config;
create policy "app_config is publicly readable"
  on public.app_config
  for select
  using (true);

-- Seed with the newest bundled key (DS UIDAI 05, valid to 2026-02-16).
-- 'do nothing' so re-running this file never clobbers an already-rotated value.
insert into public.app_config (key, value) values (
  'uidai_spki_keys',
  '["MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmMIJKj28JcTN1B72p2/pgzDCoguhs/rbIXgN/ybNNh0NVOrZV2KllrmT5VOYlMrABpvIp7JU/n6hma3/O14n7nvngJ/y3colh8rk7msDwVAO7ZuVD+GCzfaYPLLkUS+wqH7M7FOHIn/pyJo1Rkxm98lO3dyox5RuLG2Uqm7JfVIomm0t7QKJoM5rf8JNvPXdwsxN89eWlT2Bf7BF//G3FKiF7ZHfvIyyqte/3orRRG/M80QqLrDP1RIeOa53ZTgILXcyQOb2yZOqNH3iN2uSKRsusNO17To5FOb2J9Hd5wIMuDv3zw4MWTrKAWuTYon90QSeGRKv1d5AQNRt0x5dSwIDAQAB"]'
) on conflict (key) do nothing;
