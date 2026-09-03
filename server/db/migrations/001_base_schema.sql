-- =====================================================================
-- Migration 001 — Base schema
-- Reconstructed from supabase schema files (see audit §2.4). One
-- authoritative CockroachDB-compatible schema. No RLS; authorization
-- lives in Express middleware. Source-of-truth notes inline.
-- =====================================================================

CREATE TYPE user_role AS ENUM ('LOCAL_MEMBER', 'OFFICIAL', 'APPROVED_OFFICIAL', 'ADMIN', 'PLATFORM_ADMIN');
CREATE TYPE verification_level AS ENUM ('UNVERIFIED', 'PHONE_VERIFIED', 'AADHAAR_VERIFIED');

-- ---------------------------------------------------------------------
-- users / residents
-- Reconciles: schema.sql users + CAPSTONE_SCHEMA users + register_resident RPC.
-- ---------------------------------------------------------------------
CREATE TABLE users (
    uid        STRING   PRIMARY KEY,
    phone      STRING   UNIQUE NOT NULL,
    gudalur_id STRING   UNIQUE NOT NULL,
    name       STRING   NOT NULL,
    email      STRING,
    locality_id STRING,
    locality_name STRING,
    custom_place_name STRING,
    pincode    STRING  DEFAULT '643212',
    role       user_role NOT NULL DEFAULT 'LOCAL_MEMBER',
    verification_level verification_level NOT NULL DEFAULT 'UNVERIFIED',
    is_blood_donor    BOOL  DEFAULT FALSE,
    blood_group       STRING,
    avatar_url        STRING,
    bio               STRING,
    lat               FLOAT8,
    lng               FLOAT8,
    aadhaar_verified   BOOL DEFAULT FALSE,
    aadhaar_last4      STRING,
    aadhaar_ref        STRING,
    password_hash      STRING,
    issues_reported            INT DEFAULT 0,
    issues_supported           INT DEFAULT 0,
    representations_created    INT DEFAULT 0,
    alerts_acknowledged        INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE locality (
    id   STRING PRIMARY KEY,
    name STRING NOT NULL,
    pincode STRING,
    lat FLOAT8,
    lng FLOAT8
);

-- ---------------------------------------------------------------------
-- officials (email-OTP admin/official access — replaces supabase.auth usage)
-- ---------------------------------------------------------------------
CREATE TABLE officials (
    id            SERIAL   PRIMARY KEY,
    email         STRING   UNIQUE NOT NULL,
    name          STRING,
    phone         STRING,
    role          user_role NOT NULL DEFAULT 'OFFICIAL',
    status        STRING   NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    approved_at   TIMESTAMPTZ,
    approved_by   STRING REFERENCES users(uid)
);

-- ---------------------------------------------------------------------
-- OTP / sessions (replaces Supabase Auth for residents AND officials).
-- ---------------------------------------------------------------------
CREATE TABLE otp_tokens (
    id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient    STRING    NOT NULL,
    channel      STRING    NOT NULL DEFAULT 'phone',
    code_hash    STRING    NOT NULL,
    salt         STRING    NOT NULL,            -- per-OTP salt to slow offline cracking
    identity_id  STRING,
    purpose      STRING    NOT NULL DEFAULT 'register',
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    used_at      TIMESTAMPTZ,
    attempts     INT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_otp_purpose CHECK (purpose IN ('register','login','official_otp','reset'))
);
CREATE INDEX idx_otp_recipient_purpose ON otp_tokens(recipient, purpose, created_at DESC);

CREATE TABLE sessions (
    id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id       STRING    NOT NULL,
    identity_kind     STRING    NOT NULL,
    refresh_token     STRING    NOT NULL UNIQUE,
    refresh_token_hash STRING  NOT NULL,
    user_agent        STRING,
    ip                STRING,
    role              user_role,
    created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at        TIMESTAMPTZ NOT NULL,
    revoked_at        TIMESTAMPTZ,
    CONSTRAINT chk_session_kind CHECK (identity_kind IN ('user','official'))
);
CREATE INDEX idx_sessions_identity ON sessions(identity_id);
CREATE INDEX idx_sessions_refresh ON sessions(refresh_token_hash);

-- ---------------------------------------------------------------------
-- manifesto signatures + submissions + stats
-- Reconciles schema_part2.sql (manifesto_signatures WITHOUT gudalur_id) vs
-- app writes (WITH gudalur_id). FIX: add gudalur_id + UNIQUE dedupe.
-- ---------------------------------------------------------------------
CREATE TABLE manifesto_signatures (
    id            BIGSERIAL PRIMARY KEY,
    name          STRING    NOT NULL,
    locality      STRING,
    contact       STRING,
    gudalur_id    STRING    NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX manifesto_signatures_gudalur_id_uk ON manifesto_signatures(gudalur_id);
CREATE INDEX manifesto_signatures_name_idx ON manifesto_signatures(name);

CREATE TABLE manifesto_submissions (
    id           BIGSERIAL  PRIMARY KEY,
    docket_ref   STRING     UNIQUE NOT NULL,
    sender_name  STRING     NOT NULL,
    sender_phone STRING,
    gudalur_id   STRING,
    locality     STRING,
    subject      STRING,
    lang         STRING DEFAULT 'en',
    source_url   STRING,
            to_emails    STRING,
    cc_emails    STRING,
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- stats read authoritative from the signature/submission tables.
CREATE TABLE manifesto_stats (
    id                  STRING PRIMARY KEY DEFAULT 'global',
    signature_count    INT,
    submission_count   INT,
    last_updated       TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------
-- petitions (community demands) + petition signs/batches
-- Reconciles petitions + support_petition RPC + petition_signs/batches.
-- sign_hash server-generated (VG-<hex>) per Phase 5; phone_last4 only.
-- ---------------------------------------------------------------------
CREATE TABLE petitions (
    id                UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
    title             STRING NOT NULL,
    title_ta          STRING,
    problem           STRING,
    problem_ta        STRING,
    demand            STRING,
    demand_ta         STRING,
    target_authority  STRING,
    evidence_summary  STRING,
    evidence_summary_ta STRING,
    support_count     INT NOT NULL DEFAULT 0,
    supporters_json   STRING NOT NULL DEFAULT '[]',
    status            STRING NOT NULL DEFAULT 'ACTIVE',
    target_signatures INT,
    deadline          TIMESTAMPTZ,
    created_by        STRING,
    created_by_name   STRING,
    created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE petition_batches (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_no         INT         UNIQUE NOT NULL,
    start_hash       STRING,
    end_hash         STRING,
    sign_count       INT         NOT NULL DEFAULT 0,
    report_url       STRING,
    forwarded_marker BOOL        NOT NULL DEFAULT FALSE,
    forwarded_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE petition_signs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sign_hash     STRING      UNIQUE NOT NULL,
    user_uid      STRING REFERENCES users(uid),
    gdr_id        STRING,
    full_name     STRING,
    village       STRING,
    phone_last4   STRING,
    aadhaar_last4 STRING,
    aadhaar_ref   STRING,
    latitude      FLOAT8,
    longitude     FLOAT8,
    user_agent_hash STRING,
    batch_no      INT         DEFAULT 1,
    forwarded     BOOL        NOT NULL DEFAULT FALSE,
        forwarded_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ---------------------------------------------------------------------
-- wildlife: incidents + sightings + voice petitions
-- Reconciles wildlife_incidents (schema.sql vs whatsapp_intake.sql enum vs
-- text). Unified as STRING + CHECK constraint.
-- ---------------------------------------------------------------------
CREATE TABLE wildlife_incidents (
    id                STRING PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type              STRING    NOT NULL,
    locality_id       STRING DEFAULT 'gudalur-town',
    generalized_area  STRING DEFAULT 'Gudalur',
    lat               FLOAT8,
    lng               FLOAT8,
    urgency           STRING DEFAULT 'MEDIUM',
    reported_by       STRING DEFAULT 'citizen',
    verified_by_forest_dept BOOL DEFAULT FALSE,
    timestamp         TIMESTAMPTZ DEFAULT now(),
    created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    media_url         STRING,
    behavior_notes    STRING,
    herd_size         INT,
    source_ref        STRING,
    transcript        STRING,
    reporter_phone    STRING,
    CONSTRAINT chk_incident_type CHECK (type IN ('human_encroachment','animal_distress','forest_fire','poaching','vehicle_collision','other')),
    CONSTRAINT chk_incident_urgency CHECK (urgency IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);

CREATE TABLE animal_sightings (
    id           STRING PRIMARY KEY DEFAULT gen_random_uuid()::text,
    place_name   STRING NOT NULL,
    sighting_time TIMESTAMPTZ DEFAULT now() NOT NULL,
    image_url    STRING,
    audio_url    STRING,
    latitude     FLOAT8,
    longitude    FLOAT8,
    transcript   STRING,
    is_verified  BOOL NOT NULL DEFAULT FALSE,
    user_uid     STRING REFERENCES users(uid),
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE voice_petitions (
    id           STRING PRIMARY KEY DEFAULT gen_random_uuid()::text,
    place_name   STRING NOT NULL,
    speaker_name STRING,
    language     STRING DEFAULT 'en',
    transcript   STRING,
    audio_url    STRING,
    latitude     FLOAT8,
    longitude    FLOAT8,
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ---------------------------------------------------------------------
-- alerts + push + audit
-- ---------------------------------------------------------------------
CREATE TABLE alerts (
    id           STRING PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title        STRING NOT NULL,
    title_local  STRING,
    body         STRING NOT NULL,
    locality_id  STRING,
    urgency      STRING DEFAULT 'MEDIUM',
    category     STRING,
    active       BOOL NOT NULL DEFAULT TRUE,
    starts_at    TIMESTAMPTZ DEFAULT now(),
    ends_at      TIMESTAMPTZ,
    lang         STRING DEFAULT 'en',
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE push_subscriptions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint      STRING NOT NULL,
    p256dh        STRING NOT NULL,
    auth          STRING NOT NULL,
    user_uid      STRING REFERENCES users(uid),
    device_label  STRING,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_seen     TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX push_subscriptions_endpoint_uk ON push_subscriptions(endpoint);
CREATE INDEX push_subscriptions_user_idx ON push_subscriptions(user_uid);

CREATE TABLE push_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       STRING,
    body        STRING,
    url         STRING,
    topic       STRING,
    sent_count  INT NOT NULL DEFAULT 0,
    status      STRING NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE audit_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    STRING,
    actor_kind  STRING NOT NULL,
    action      STRING NOT NULL,
    target      STRING,
    detail      STRING,
    ip          STRING,
    user_agent  STRING,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ---------------------------------------------------------------------
-- config (replaces app_config uidai_spki_keys read) + sync idempotency
-- ---------------------------------------------------------------------
CREATE TABLE app_config (
    key        STRING PRIMARY KEY,
    value      STRING,
    description STRING
);

CREATE TABLE sync_idempotency (
    idempotency_key STRING PRIMARY KEY,
    kind            STRING NOT NULL,
    response        STRING,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);


