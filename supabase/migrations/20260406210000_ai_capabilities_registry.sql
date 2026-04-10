-- Fase 3.2 — Discovery Worker: catálogo dinámico de capacidades (voces, modelos, etc.)
CREATE SCHEMA IF NOT EXISTS fifer_platform;

CREATE TABLE IF NOT EXISTS fifer_platform.ai_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  capability_type text NOT NULL,
  external_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_capabilities_provider_external_unique UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_capabilities_provider
  ON fifer_platform.ai_capabilities (provider);

CREATE INDEX IF NOT EXISTS idx_ai_capabilities_capability_type
  ON fifer_platform.ai_capabilities (capability_type);

CREATE INDEX IF NOT EXISTS idx_ai_capabilities_active
  ON fifer_platform.ai_capabilities (is_active) WHERE is_active = true;

CREATE OR REPLACE FUNCTION fifer_platform.ai_capabilities_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_capabilities_updated ON fifer_platform.ai_capabilities;
CREATE TRIGGER trg_ai_capabilities_updated
  BEFORE UPDATE ON fifer_platform.ai_capabilities
  FOR EACH ROW
  EXECUTE PROCEDURE fifer_platform.ai_capabilities_set_updated_at();

COMMENT ON TABLE fifer_platform.ai_capabilities IS 'Catálogo descubierto por Discovery Worker; upsert por (provider, external_id).';
