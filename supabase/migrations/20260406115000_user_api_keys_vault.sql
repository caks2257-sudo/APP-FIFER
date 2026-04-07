CREATE SCHEMA IF NOT EXISTS fifer_auth;

CREATE TABLE IF NOT EXISTS fifer_auth.user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'groq', 'elevenlabs')),
  encrypted_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_api_keys_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id
  ON fifer_auth.user_api_keys (user_id);

CREATE OR REPLACE FUNCTION fifer_auth.user_api_keys_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_api_keys_updated ON fifer_auth.user_api_keys;
CREATE TRIGGER trg_user_api_keys_updated
BEFORE UPDATE ON fifer_auth.user_api_keys
FOR EACH ROW
EXECUTE PROCEDURE fifer_auth.user_api_keys_set_updated_at();

