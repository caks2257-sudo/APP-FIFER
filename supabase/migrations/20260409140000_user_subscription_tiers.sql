-- Niveles de suscripción (free | pro) + flag PRO en capacidades de catálogo (Smart Task Router / UI).
CREATE TABLE IF NOT EXISTS fifer_auth.user_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  tier_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_tier
  ON fifer_auth.user_profile (subscription_tier);

COMMENT ON TABLE fifer_auth.user_profile IS 'Perfil de producto: tier de suscripción para gating del router IA y UI.';

ALTER TABLE fifer_platform.ai_capabilities
  ADD COLUMN IF NOT EXISTS requires_pro boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN fifer_platform.ai_capabilities.requires_pro IS 'Si true, recurso reservado a FIFER Pro (UI candado / badge).';
