-- Publish callback: URL final tras éxito en Make.com / plataforma externa
ALTER TABLE fifer_platform.campaign_drafts
  ADD COLUMN IF NOT EXISTS published_url text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

COMMENT ON COLUMN fifer_platform.campaign_drafts.published_url IS 'URL pública del activo publicado (video/post); rellenada vía PATCH /publish-callback.';
COMMENT ON COLUMN fifer_platform.campaign_drafts.published_at IS 'Marca temporal de acuse EXTERNAL_PUBLISH_SUCCESS desde Make.';

CREATE INDEX IF NOT EXISTS idx_campaign_drafts_published_at
  ON fifer_platform.campaign_drafts (published_at DESC)
  WHERE published_at IS NOT NULL;
