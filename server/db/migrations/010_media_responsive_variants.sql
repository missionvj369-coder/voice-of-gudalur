-- =====================================================================
-- Media responsive variants — store generated sizes, blurhash, dominant color
-- =====================================================================
-- Enables the intelligent media pipeline: multiple sizes per upload,
-- instant blurhash placeholders, and adaptive UI backgrounds.

ALTER TABLE media_posts
  ADD COLUMN IF NOT EXISTS variants_json JSONB DEFAULT '[]'::JSONB;

ALTER TABLE media_posts
  ADD COLUMN IF NOT EXISTS blurhash STRING DEFAULT NULL;

ALTER TABLE media_posts
  ADD COLUMN IF NOT EXISTS dominant_color STRING DEFAULT NULL;

ALTER TABLE media_posts
  ADD COLUMN IF NOT EXISTS original_width INT DEFAULT NULL;

ALTER TABLE media_posts
  ADD COLUMN IF NOT EXISTS original_height INT DEFAULT NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS media_posts_active_created_idx
  ON media_posts (active, created_at DESC);
