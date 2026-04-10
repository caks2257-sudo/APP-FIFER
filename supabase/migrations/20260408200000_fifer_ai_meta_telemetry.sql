-- Meta-Sync & Telemetry — catálogo IA reactivo (FIFER)
-- Hidratación de costos/ranking desde app; sync-worker hace upsert.

CREATE TABLE IF NOT EXISTS fifer_platform.fifer_ai_meta (
  engine_id text PRIMARY KEY,
  provider text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  specialty text NOT NULL DEFAULT '',
  cost_per_unit numeric NOT NULL DEFAULT 0,
  unit_type text NOT NULL CHECK (unit_type IN ('tokens', 'images', 'seconds', 'characters')),
  ranking_general numeric NOT NULL DEFAULT 8,
  ranking_task_specific jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_window_tokens integer,
  provider_model_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  margin_volatility_bump numeric NOT NULL DEFAULT 0,
  last_sync_source text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fifer_ai_meta_provider ON fifer_platform.fifer_ai_meta (provider);
CREATE INDEX IF NOT EXISTS idx_fifer_ai_meta_active ON fifer_platform.fifer_ai_meta (is_active) WHERE is_active = true;

CREATE OR REPLACE FUNCTION fifer_platform.fifer_ai_meta_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fifer_ai_meta_updated ON fifer_platform.fifer_ai_meta;
CREATE TRIGGER trg_fifer_ai_meta_updated
  BEFORE UPDATE ON fifer_platform.fifer_ai_meta
  FOR EACH ROW
  EXECUTE PROCEDURE fifer_platform.fifer_ai_meta_set_updated_at();

CREATE TABLE IF NOT EXISTS fifer_platform.fifer_ai_telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_id text NOT NULL,
  latency_ms integer NOT NULL,
  http_status integer NOT NULL,
  ok boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fifer_ai_telemetry_engine_time
  ON fifer_platform.fifer_ai_telemetry_events (engine_id, created_at DESC);

COMMENT ON TABLE fifer_platform.fifer_ai_meta IS 'Catálogo IA: costos y ranking hidratados por sync-worker + admin.';
COMMENT ON TABLE fifer_platform.fifer_ai_telemetry_events IS 'Latencia y éxito por llamada real; alimenta ranking dinámico.';

CREATE TABLE IF NOT EXISTS fifer_platform.fifer_ai_admin_settings (
  id text PRIMARY KEY DEFAULT 'default',
  base_margin_percent numeric NOT NULL DEFAULT 20,
  volatility_sensitivity numeric NOT NULL DEFAULT 1.0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO fifer_platform.fifer_ai_admin_settings (id, base_margin_percent, volatility_sensitivity)
VALUES ('default', 20, 1.0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE fifer_platform.fifer_ai_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE fifer_platform.fifer_ai_telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fifer_platform.fifer_ai_admin_settings ENABLE ROW LEVEL SECURITY;
