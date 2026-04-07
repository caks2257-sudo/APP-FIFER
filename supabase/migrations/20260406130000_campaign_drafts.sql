-- Persistent Workspace: URL campaign drafts (fifer_platform)
CREATE SCHEMA IF NOT EXISTS fifer_platform;

CREATE TABLE IF NOT EXISTS fifer_platform.campaign_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'discarded')),
  strategy_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_drafts_user_id
  ON fifer_platform.campaign_drafts (user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_drafts_created_at
  ON fifer_platform.campaign_drafts (created_at DESC);

CREATE OR REPLACE FUNCTION fifer_platform.campaign_drafts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaign_drafts_updated ON fifer_platform.campaign_drafts;

CREATE TRIGGER trg_campaign_drafts_updated
  BEFORE UPDATE ON fifer_platform.campaign_drafts
  FOR EACH ROW
  EXECUTE PROCEDURE fifer_platform.campaign_drafts_set_updated_at();

COMMENT ON TABLE fifer_platform.campaign_drafts IS 'URL ingestion campaign drafts; inserts via service_role API, reads via RLS for authenticated users.';

ALTER TABLE fifer_platform.campaign_drafts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'fifer_platform'
      AND tablename = 'campaign_drafts'
      AND policyname = 'campaign_drafts_select_own'
  ) THEN
    CREATE POLICY campaign_drafts_select_own ON fifer_platform.campaign_drafts
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
