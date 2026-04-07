CREATE SCHEMA IF NOT EXISTS fifer_platform;

CREATE TABLE IF NOT EXISTS fifer_platform.ad_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES fifer_platform.campaign_drafts (id) ON DELETE CASCADE,
  platform_ad_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  platform_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_mappings_draft_platform_unique
  ON fifer_platform.ad_mappings (draft_id, platform_name);

CREATE INDEX IF NOT EXISTS idx_ad_mappings_platform_ad_id
  ON fifer_platform.ad_mappings (platform_ad_id);

CREATE OR REPLACE FUNCTION fifer_platform.ad_mappings_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ad_mappings_updated ON fifer_platform.ad_mappings;
CREATE TRIGGER trg_ad_mappings_updated
BEFORE UPDATE ON fifer_platform.ad_mappings
FOR EACH ROW
EXECUTE PROCEDURE fifer_platform.ad_mappings_set_updated_at();

