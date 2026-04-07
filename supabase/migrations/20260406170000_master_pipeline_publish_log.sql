-- Durable log for Make.com publish attempts (master pipeline jobs). Idempotent.
CREATE SCHEMA IF NOT EXISTS fifer_platform;

CREATE TABLE IF NOT EXISTS fifer_platform.master_pipeline_publish_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL,
  publish_status text NOT NULL,
  error text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_pipeline_publish_job
  ON fifer_platform.master_pipeline_publish_log (job_id);

COMMENT ON TABLE fifer_platform.master_pipeline_publish_log IS 'Make.com webhook outcomes for async pipeline jobs; does not replace in-memory job_store.';
