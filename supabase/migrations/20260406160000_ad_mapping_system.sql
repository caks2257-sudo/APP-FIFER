CREATE SCHEMA IF NOT EXISTS fifer_platform;

CREATE TABLE IF NOT EXISTS fifer_platform.ad_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES fifer_platform.campaign_drafts (id) ON DELETE CASCADE,
  platform_name text NOT NULL,
  platform_ad_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_mappings_platform_ad_id_unique
  ON fifer_platform.ad_mappings (platform_ad_id);

CREATE INDEX IF NOT EXISTS idx_ad_mappings_platform_ad_id
  ON fifer_platform.ad_mappings (platform_ad_id);

