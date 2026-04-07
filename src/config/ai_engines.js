const AI_ENGINES = [
  {
    id: "groq_open",
    name: "Groq / Llama 3",
    description: "Open Source de alto rendimiento y costo casi cero.",
    estimated_cost_usd: 0.0,
    recommended_niches: ["general", "testing", "open-source"],
    is_active: true,
    text_model: "llama3-70b-8192",
    video_model: null,
    vendor: "groq",
  },
  {
    id: "openai_text",
    name: "OpenAI GPT",
    description: "Servicio oficial OpenAI para generacion de texto con BYOK.",
    estimated_cost_usd: 0.15,
    recommended_niches: ["copywriting", "tech", "general"],
    is_active: true,
    text_model: "gpt-4o-mini",
    video_model: null,
    vendor: "openai",
  },
  {
    id: "elevenlabs_voice",
    name: "ElevenLabs TTS",
    description: "Sintesis de voz premium para audio narrado y anuncios.",
    estimated_cost_usd: 0.08,
    recommended_niches: ["audio", "podcast", "video-voiceover"],
    is_active: true,
    text_model: null,
    video_model: null,
    voice_model: "eleven_multilingual_v2",
    vendor: "elevenlabs",
  },
  {
    id: "economic",
    name: "Gemini Flash",
    description: "Rapido y economico, ideal para pruebas.",
    estimated_cost_usd: 0.02,
    recommended_niches: ["general", "testing"],
    is_active: true,
    text_model: "gemini-2.5-flash",
    video_model: null,
    vendor: "google",
  },
  {
    id: "balanced",
    name: "GPT-4o",
    description: "Balance entre calidad y coste para tech y productos complejos.",
    estimated_cost_usd: 0.12,
    recommended_niches: ["tech", "tecnologia", "electronics"],
    is_active: true,
    text_model: "gpt-4o",
    video_model: null,
    vendor: "openai",
  },
  {
    id: "premium",
    name: "Claude 3.5 + HeyGen",
    description: "Maxima calidad para storytelling y contenido premium con video.",
    estimated_cost_usd: 0.5,
    recommended_niches: ["moda", "fashion", "hogar", "home", "decor"],
    is_active: true,
    text_model: "claude-3.5-sonnet",
    video_model: "runway-gen4",
    vendor: "anthropic+runway",
  },
];

const ENGINE_TIERS = Object.fromEntries(AI_ENGINES.map((e) => [e.id, e]));

function getActiveEngines() {
  return AI_ENGINES.filter((e) => e.is_active);
}

function normalizeTier(tier) {
  const t = String(tier || "").trim().toLowerCase();
  if (!t) return null;
  return ENGINE_TIERS[t] ? t : null;
}

function getEngineByTier(tier) {
  const t = normalizeTier(tier);
  return t ? ENGINE_TIERS[t] : null;
}

function recommendEngineForNiche(niche) {
  const n = String(niche || "").trim().toLowerCase();
  if (!n) return "economic";
  if (/(tech|tecnologia|electronic|gadget)/.test(n)) return "balanced";
  if (/(moda|fashion|hogar|home|decor)/.test(n)) return "premium";
  return "economic";
}

module.exports = {
  AI_ENGINES,
  ENGINE_TIERS,
  normalizeTier,
  getEngineByTier,
  getActiveEngines,
  recommendEngineForNiche,
};
