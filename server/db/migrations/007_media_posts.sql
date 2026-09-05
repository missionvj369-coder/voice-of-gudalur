-- =====================================================================
-- Migration 007 — Media posts (posters + videos) for "Support the Movement"
-- CockroachDB only (Storj object storage removed). Media is stored as a
-- base64 data URL in the app's own database so the admin-uploaded posters
-- and videos appear in the public frontend with no external bucket.
-- =====================================================================

CREATE TABLE IF NOT EXISTS media_posts (
    id          STRING PRIMARY KEY DEFAULT gen_random_uuid()::text,
    kind        STRING NOT NULL DEFAULT 'poster' CHECK (kind IN ('poster', 'video')),
    title       STRING NOT NULL,
    description STRING,
    data_url    STRING,               -- base64 data URL (app-hosted)
    file_url    STRING,               -- optional external URL (future)
    mime        STRING,
    size_bytes  INT,
    created_by  STRING REFERENCES users(uid),
    active      BOOL NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS media_posts_created_idx ON media_posts(created_at DESC);