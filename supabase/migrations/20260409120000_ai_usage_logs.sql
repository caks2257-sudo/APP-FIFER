-- Cost Savings Tracker — registros de uso del Smart Task Router (actual vs baseline premium).
CREATE TABLE IF NOT EXISTS fifer_finance.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  provider_used text NOT NULL,
  tokens_or_units integer NOT NULL DEFAULT 0,
  actual_cost numeric(18, 8) NOT NULL DEFAULT 0,
  baseline_cost numeric(18, 8) NOT NULL DEFAULT 0,
  savings numeric(18, 8) GENERATED ALWAYS AS (baseline_cost - actual_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at
  ON fifer_finance.ai_usage_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_task_type
  ON fifer_finance.ai_usage_logs (task_type);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_task_type_created
  ON fifer_finance.ai_usage_logs (task_type, created_at DESC);

COMMENT ON TABLE fifer_finance.ai_usage_logs IS 'Uso de IA vía Smart Task Router: costo real vs baseline premium (ahorro = baseline - actual).';
