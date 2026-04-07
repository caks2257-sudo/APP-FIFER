-- Phase 5 — App Marketing scaffold (idempotent; additive to fifer_platform)

CREATE SCHEMA IF NOT EXISTS fifer_platform;

CREATE TABLE IF NOT EXISTS fifer_platform.app_marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    name TEXT NOT NULL,
    objective_key TEXT NOT NULL CHECK (objective_key IN ('sales_explosive', 'high_commission', 'viral_growth', 'custom')),
    play_template_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'archived')),
    scoring_profile_id TEXT,
    product_selection JSONB NOT NULL DEFAULT '{}'::jsonb,
    rollout JSONB NOT NULL DEFAULT '{}'::jsonb,
    estimated_credits JSONB NOT NULL DEFAULT '{}'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_mkt_campaigns_owner ON fifer_platform.app_marketing_campaigns (owner_id);
CREATE INDEX IF NOT EXISTS idx_app_mkt_campaigns_objective ON fifer_platform.app_marketing_campaigns (objective_key);
CREATE INDEX IF NOT EXISTS idx_app_mkt_campaigns_status ON fifer_platform.app_marketing_campaigns (status);

CREATE TABLE IF NOT EXISTS fifer_platform.app_marketing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES fifer_platform.app_marketing_campaigns (id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('render', 'schedule', 'publish', 'rank_refresh', 'ab_evaluate', 'credit_reconcile')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    priority INTEGER NOT NULL DEFAULT 0,
    run_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_mkt_jobs_campaign ON fifer_platform.app_marketing_jobs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_app_mkt_jobs_run_at ON fifer_platform.app_marketing_jobs (run_at) WHERE status = 'pending';

COMMENT ON TABLE fifer_platform.app_marketing_campaigns IS 'App Marketing campaign bound to a play template; product_selection stores rank filters + tag refs.';
COMMENT ON TABLE fifer_platform.app_marketing_jobs IS 'Durable queue for render/schedule/publish; workers poll by run_at.';
