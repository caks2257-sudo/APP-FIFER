-- Publish Webhook Dispatcher: estados tras envío a Make.com (processing_external / failed_dispatch)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'fifer_platform'
      AND t.relname = 'campaign_drafts'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE fifer_platform.campaign_drafts DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE fifer_platform.campaign_drafts
ADD CONSTRAINT campaign_drafts_status_check
CHECK (
  status IN (
    'draft',
    'published',
    'discarded',
    'paused_by_inventory',
    'processing_external',
    'failed_dispatch'
  )
);

COMMENT ON CONSTRAINT campaign_drafts_status_check ON fifer_platform.campaign_drafts IS
  'draft lifecycle + inventory pause + Make publish dispatcher (processing_external / failed_dispatch).';
