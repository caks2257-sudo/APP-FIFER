-- API Health Monitor — ping periódico a proveedores de modelos (OpenRouter, Groq, etc.)
-- Escritura vía service_role (`src/system/api_health_monitor.js`); lectura vía GET `/api/v1/master/system/api-health`.

CREATE SCHEMA IF NOT EXISTS fifer_platform;

CREATE TABLE IF NOT EXISTS fifer_platform.api_health_status (
  provider_name TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'degraded', 'unconfigured')),
  latency_ms INTEGER,
  last_error TEXT,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_health_status_checked
  ON fifer_platform.api_health_status (last_checked_at DESC);

COMMENT ON TABLE fifer_platform.api_health_status IS 'Estado de conexión y latencia por proveedor externo de modelos; actualizado por api_health_monitor.js.';
