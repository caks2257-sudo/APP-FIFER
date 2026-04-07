CREATE SCHEMA IF NOT EXISTS fifer_finance;

CREATE TABLE IF NOT EXISTS fifer_finance.ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ai_spend', 'referral_earn', 'top_up', 'adjustment', 'refund')),
  amount numeric(18, 6) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('pending', 'posted', 'reversed', 'failed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user_id
  ON fifer_finance.ledger (user_id);

CREATE INDEX IF NOT EXISTS idx_ledger_status
  ON fifer_finance.ledger (status);

CREATE INDEX IF NOT EXISTS idx_ledger_created_at
  ON fifer_finance.ledger (created_at DESC);

CREATE TABLE IF NOT EXISTS fifer_finance.platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_draft_id uuid REFERENCES fifer_platform.campaign_drafts (id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  gross_commission numeric(18, 6) NOT NULL DEFAULT 0,
  platform_share numeric(18, 6) NOT NULL DEFAULT 0,
  user_share numeric(18, 6) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_campaign
  ON fifer_finance.platform_revenue (campaign_draft_id);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_user
  ON fifer_finance.platform_revenue (user_id);

CREATE OR REPLACE FUNCTION fifer_finance.ledger_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_updated ON fifer_finance.ledger;
CREATE TRIGGER trg_ledger_updated
BEFORE UPDATE ON fifer_finance.ledger
FOR EACH ROW
EXECUTE PROCEDURE fifer_finance.ledger_set_updated_at();

CREATE OR REPLACE FUNCTION fifer_finance.platform_revenue_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_platform_revenue_updated ON fifer_finance.platform_revenue;
CREATE TRIGGER trg_platform_revenue_updated
BEFORE UPDATE ON fifer_finance.platform_revenue
FOR EACH ROW
EXECUTE PROCEDURE fifer_finance.platform_revenue_set_updated_at();
