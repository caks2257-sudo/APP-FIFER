/**
 * Fixtures for FEATURE_DRY_RUN / payload.dry_run — same shapes as live Tag-Center + Gemini marketing.
 * No network calls; safe for zero-credit pipeline tests.
 */

const TAG_CENTER_MOCK = {
  source: "dry_run",
  schema: "fifer_platform.tags",
  count: 12,
  /** Agregado tipo “ranking” para alinear con vistas que esperan score en capa tags */
  score: 78,
  tags_snapshot: [
    {
      id: "00000000-0001-4000-8000-000000000001",
      slug: "high-intent",
      type: "intent",
      label: "Alta intención de compra",
      confidence: 0.91,
    },
    {
      id: "00000000-0002-4000-8000-000000000002",
      slug: "budget-conscious",
      type: "persona",
      label: "Comprador consciente del precio",
      confidence: 0.84,
    },
    {
      id: "00000000-0003-4000-8000-000000000003",
      slug: "mobile-first",
      type: "channel",
      label: "Consumo principalmente móvil",
      confidence: 0.88,
    },
  ],
};

/** Strategy slice aligned with pipeline strategyContext + formatMakePayload.strategy */
const STRATEGY_CONTEXT_MOCK = {
  tags: ["high-intent", "budget-conscious", "mobile-first"],
  score: 78,
  urgency_level: "HIGH",
  primary_niche: "consumer_electronics",
  price_tier: "mid",
  routing: "conversion_focused",
  gemini_rationale:
    "[SIMULACIÓN] Priorizar reels ≤30s, CTA directo y prueba social; evitar bloques de texto largos en feed.",
};

/** Mimics a Gemini JSON-style marketing payload merged into campaign_content.assets */
const GEMINI_MARKETING_STRATEGY_MOCK = {
  model: "gemini-2.0-flash",
  finish_reason: "STOP",
  usage: { prompt_tokens: 512, candidates_tokens: 256, total_tokens: 768 },
  campaign: {
    objective: "traffic_and_conversion",
    tone: "confident_friendly",
    hook: "¿Sigues pagando de más por lo mismo?",
    primary_message:
      "Texto ficticio pero realista para validar el pipeline sin consumir créditos de producción.",
    cta: "Ver oferta limitada",
    hashtags: ["#Oferta", "#Tech", "#DryRun"],
    recommended_formats: ["reel_15s", "carousel_5", "story_sequence"],
    ab_test_variant: "A",
  },
};

const MARKETING_BOT_MOCK = {
  ...GEMINI_MARKETING_STRATEGY_MOCK,
  format_type: "reel",
  platforms: ["instagram", "tiktok"],
  /** URL ficticia estable (Make puede filtrar por presencia de campo) */
  video_url: "https://example.com/fifer/dry-run/sample-reel.mp4",
  caption: GEMINI_MARKETING_STRATEGY_MOCK.campaign.primary_message,
  voice_id: "dry-run-elevenlabs-placeholder",
};

module.exports = {
  TAG_CENTER_MOCK,
  STRATEGY_CONTEXT_MOCK,
  GEMINI_MARKETING_STRATEGY_MOCK,
  MARKETING_BOT_MOCK,
};
