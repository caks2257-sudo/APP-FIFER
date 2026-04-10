/**
 * Fase 5 — Curador inteligente: recomienda voces y modelos según nicho del producto.
 * Refinamiento de voces vía Smart Task Router (`complex_reasoning`) + heurística local como respaldo.
 * Autosanación: si el router falla, se devuelve solo el baseline heurístico sin tumbar el pipeline.
 */

const { routeTask } = require("./ai_task_router.js");

/** Palabras (ES/EN) → conceptos internos alineados con etiquetas en metadata (ElevenLabs, etc.) */
const KEYWORD_TO_CONCEPTS = [
  { re: /\b(deporte|deportiv|sport|running|correr|gym|fitness|zapatill|sneaker|athletic|fútbol|futbol|soccer|basket|nba)\b/i, concepts: ["energy", "high-energy", "dynamic"] },
  { re: /\b(yoga|medit|relaj|calm|zen|wellness|spa|mindful)\b/i, concepts: ["calm", "soft", "warm"] },
  { re: /\b(libro|audiobook|podcast|narrativ|historia|storytelling|cuento)\b/i, concepts: ["narrative", "deep", "expressive"] },
  { re: /\b(tech|tecnolog|gadget|electrón|electron|software|código|code|developer|gaming|gamer|pc)\b/i, concepts: ["professional", "deep", "clear"] },
  { re: /\b(moda|fashion|luxury|elegan|diseño|design|belleza|beauty|cosmétic)\b/i, concepts: ["smooth", "calm", "expressive"] },
  { re: /\b(niño|kids|infantil|juguete|toy|family)\b/i, concepts: ["warm", "soft", "expressive"] },
  { re: /\b(comida|food|receta|kitchen|cocina|restaurant)\b/i, concepts: ["warm", "expressive", "dynamic"] },
];

function normalizeText(productData) {
  const name = String(productData?.name || "").trim();
  const description = String(productData?.description || "").trim();
  const category = String(productData?.category || "").trim();
  const excerpt = String(productData?.excerpt || "").trim();
  return `${name}\n${description}\n${category}\n${excerpt}`.toLowerCase();
}

function detectConcepts(blob) {
  const scores = {};
  for (const row of KEYWORD_TO_CONCEPTS) {
    if (row.re.test(blob)) {
      for (const c of row.concepts) {
        scores[c] = (scores[c] || 0) + 1;
      }
    }
  }
  return scores;
}

function flattenMetadataLabels(metadata) {
  const m = metadata && typeof metadata === "object" ? metadata : {};
  const labels = m.labels && typeof m.labels === "object" ? m.labels : {};
  const parts = [];
  for (const [k, v] of Object.entries(labels)) {
    parts.push(String(k).toLowerCase());
    parts.push(String(v).toLowerCase());
  }
  if (m.use_case) parts.push(String(m.use_case).toLowerCase());
  if (m.category) parts.push(String(m.category).toLowerCase());
  return parts.join(" ");
}

/**
 * @param {object} cap - fila ai_capabilities
 * @param {Record<string, number>} conceptWeights
 * @param {string} productBlob - texto del producto (normalizado)
 */
function scoreCapability(cap, conceptWeights, productBlob) {
  const type = String(cap.capability_type || "");
  const metaStr = flattenMetadataLabels(cap.metadata);
  const nameStr = String(cap.name || "").toLowerCase();
  const haystack = `${metaStr} ${nameStr}`;

  let raw = 0;
  let matches = 0;
  for (const [concept, w] of Object.entries(conceptWeights)) {
    if (!w) continue;
    const c = concept.toLowerCase();
    if (haystack.includes(c.replace(/-/g, " ")) || haystack.includes(c)) {
      raw += w * 12;
      matches += 1;
    }
  }

  if (Object.keys(conceptWeights).length === 0) {
    return { match_score: 55, reason: "no_product_signals" };
  }

  if (matches === 0) {
    if (/(deep|professional|narrative|expressive)/i.test(haystack)) raw += 8;
    const energeticProduct = /\b(energy|dynamic|sport|deporte)\b/i.test(productBlob || "");
    if (energeticProduct && /(fast|instant|turbo|high)/i.test(haystack)) raw += 6;
  }

  const normalized = Math.min(100, Math.max(15, Math.round(35 + raw + (type === "voice" ? 5 : 0))));
  return { match_score: normalized, reason: matches ? "label_match" : "fallback_boost" };
}

/**
 * Baseline heurístico (sin LLM).
 * @param {object} productData
 * @param {Array<object>} capabilities
 */
function recommendCapabilitiesHeuristic(productData, capabilities) {
  const list = Array.isArray(capabilities) ? capabilities : [];
  const blob = normalizeText(productData);
  const conceptWeights = detectConcepts(blob);

  const voices = list.filter((c) => String(c.capability_type) === "voice");
  const textModels = list.filter((c) => String(c.capability_type) === "text_model");

  const mapRow = (cap) => {
    const { match_score, reason } = scoreCapability(cap, conceptWeights, blob);
    return {
      ...cap,
      match_score,
      match_reason: reason,
      is_recommended: false,
    };
  };

  const scoredVoices = voices.map(mapRow).sort((a, b) => b.match_score - a.match_score);
  const scoredModels = textModels.map(mapRow).sort((a, b) => b.match_score - a.match_score);

  for (let i = 0; i < Math.min(3, scoredVoices.length); i++) {
    scoredVoices[i].is_recommended = true;
  }
  for (let i = 0; i < Math.min(3, scoredModels.length); i++) {
    scoredModels[i].is_recommended = true;
  }

  return {
    voices: scoredVoices,
    text_models: scoredModels,
    product_signals: {
      concepts: conceptWeights,
      text_sample: blob.slice(0, 280),
    },
  };
}

function tryParseCuratorJson(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : t;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) {
        return JSON.parse(raw.slice(start, end + 1));
      }
    } catch {
      /* noop */
    }
  }
  return null;
}

function voiceKeyMatches(cap, key) {
  const k = String(key || "").trim();
  if (!k) return false;
  if (String(cap.id) === k) return true;
  if (String(cap.external_id || "") === k) return true;
  if (String(cap.name || "").toLowerCase() === k.toLowerCase()) return true;
  return false;
}

/**
 * Aplica ranking del router sobre voces; mantiene text_models del heurístico.
 */
function mergeVoiceRouterRanking(scoredVoices, parsed, routedVia) {
  const topIds = Array.isArray(parsed?.top_voice_ids) ? parsed.top_voice_ids.map(String) : [];
  if (!topIds.length) {
    return {
      voices: scoredVoices,
      applied: false,
      reasoning: parsed?.reasoning || null,
    };
  }

  const boosted = scoredVoices.map((v) => {
    const rank = topIds.findIndex((id) => voiceKeyMatches(v, id));
    const router_rank = rank >= 0 ? rank : 999;
    const router_boost = rank >= 0 ? (topIds.length - rank) * 8 : 0;
    return {
      ...v,
      router_rank,
      router_boost,
      match_score_router: Math.min(100, v.match_score + router_boost),
    };
  });

  boosted.sort((a, b) => {
    const ra = a.router_rank;
    const rb = b.router_rank;
    if (ra !== rb) return ra - rb;
    return (b.match_score_router || b.match_score) - (a.match_score_router || a.match_score);
  });

  for (const v of boosted) {
    v.is_recommended = false;
  }
  for (let i = 0; i < Math.min(3, boosted.length); i++) {
    if (boosted[i].router_rank < 900) boosted[i].is_recommended = true;
  }
  if (!boosted.some((v) => v.is_recommended)) {
    for (let i = 0; i < Math.min(3, boosted.length); i++) {
      boosted[i].is_recommended = true;
    }
  }

  return {
    voices: boosted,
    applied: true,
    reasoning: parsed?.reasoning || null,
    routed_via: routedVia,
  };
}

function buildCuratorRouterPrompt(productData, scoredVoices) {
  const product = {
    name: String(productData?.name || "").slice(0, 400),
    category: String(productData?.category || "").slice(0, 200),
    excerpt: String(productData?.excerpt || productData?.description || "").slice(0, 2500),
  };
  const candidates = scoredVoices.slice(0, 24).map((v) => ({
    id: v.id,
    external_id: v.external_id || null,
    name: v.name,
    provider: v.provider,
    match_score_heuristic: v.match_score,
    metadata: v.metadata || {},
  }));
  return [
    "Eres director de casting de voz para anuncios y short-form video.",
    "Elige las voces que mejor encajan con el producto y el tono del nicho.",
    "Responde SOLO con un JSON válido (sin markdown) con esta forma exacta:",
    '{"top_voice_ids":["<id uuid o external_id en orden de preferencia>"],"reasoning":"<una frase breve en español>"}',
    "Usa como máximo 5 ids en top_voice_ids; deben existir en candidates.",
    "",
    "PRODUCTO:",
    JSON.stringify(product, null, 0),
    "",
    "CANDIDATAS (voice):",
    JSON.stringify(candidates, null, 0),
  ].join("\n");
}

/**
 * @param {object} productData - name, description, category, excerpt opcional
 * @param {Array<object>} capabilities - filas de ai_capabilities
 * @param {{ userId?: string | null, userTier?: 'free'|'pro' }} [routingContext] — Smart Task Router (tier / BYOK)
 * @returns {Promise<{ voices: Array, text_models: Array, product_signals: object, curator_router?: object }>}
 */
async function recommendCapabilities(productData, capabilities, routingContext = {}) {
  const base = recommendCapabilitiesHeuristic(productData, capabilities);

  if (!base.voices.length) {
    return {
      ...base,
      curator_router: {
        ok: true,
        skipped: true,
        reason: "no_voice_capabilities",
        routed_via: null,
      },
    };
  }

  const prompt = buildCuratorRouterPrompt(productData, base.voices);
  let routerOut;
  try {
    routerOut = await routeTask(
      "complex_reasoning",
      {
        prompt,
        max_tokens: 900,
        temperature: 0.2,
      },
      routingContext
    );
  } catch (err) {
    return {
      ...base,
      curator_router: {
        ok: false,
        error: err?.message || String(err),
        routed_via: null,
        routing: null,
      },
    };
  }

  if (!routerOut.ok) {
    return {
      ...base,
      curator_router: {
        ok: false,
        error: routerOut.error || "router_exhausted",
        routing: routerOut.routing || null,
        routed_via: routerOut.routed_via ?? null,
      },
    };
  }

  const text = routerOut.data?.text || "";
  const parsed = tryParseCuratorJson(text);
  if (!parsed) {
    return {
      ...base,
      curator_router: {
        ok: false,
        error: "curator_json_parse_failed",
        raw_preview: text.slice(0, 600),
        routed_via: routerOut.routed_via,
        routing: routerOut.routing || null,
      },
    };
  }

  const merged = mergeVoiceRouterRanking(base.voices, parsed, routerOut.routed_via);
  return {
    voices: merged.voices,
    text_models: base.text_models,
    product_signals: base.product_signals,
    curator_router: {
      ok: true,
      routed_via: routerOut.routed_via,
      router_applied: merged.applied,
      reasoning: merged.reasoning,
      routing: routerOut.routing || null,
    },
  };
}

module.exports = {
  recommendCapabilities,
  recommendCapabilitiesHeuristic,
  detectConcepts,
  KEYWORD_TO_CONCEPTS,
};
