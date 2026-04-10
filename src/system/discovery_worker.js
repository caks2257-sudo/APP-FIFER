/**
 * Fase 3.2 — Discovery Worker ("Radar")
 * Consulta APIs conectadas y persiste capacidades en `fifer_platform.ai_capabilities`.
 *
 * Esquema: `FIFER_PLATFORM_SCHEMA` (default `fifer_platform`). Debe figurar en "Exposed schemas"
 * del proyecto (Dashboard → Settings → API) y, en local, en `supabase/config.toml` → [api].schemas.
 */
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const DEFAULT_PLATFORM_DB_SCHEMA = "fifer_platform";

function resolvePlatformDbSchema() {
  let s = String(process.env.FIFER_PLATFORM_SCHEMA || DEFAULT_PLATFORM_DB_SCHEMA).trim();
  if (s === "fiferr_platform") s = DEFAULT_PLATFORM_DB_SCHEMA;
  return s || DEFAULT_PLATFORM_DB_SCHEMA;
}

const PLATFORM_DB_SCHEMA = resolvePlatformDbSchema();

let _supabase = null;

function formatCapabilityDbError(err) {
  const msg = typeof err === "string" ? err : String(err?.message || "upsert_failed");
  const code = err && typeof err === "object" && err.code != null ? String(err.code) : "";
  if (code === "PGRST106" || /invalid schema/i.test(msg) || /schema must be one of the following/i.test(msg)) {
    return `${msg} — Expón el esquema "${PLATFORM_DB_SCHEMA}" en Supabase (API → Exposed schemas) y aplica la migración de GRANTs; en local: [api].schemas en supabase/config.toml.`;
  }
  return msg;
}

function getSupabaseServiceClient() {
  if (_supabase) return _supabase;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: PLATFORM_DB_SCHEMA },
  });
  return _supabase;
}

function readGroqStaticModels() {
  const raw = String(process.env.GROQ_DISCOVERY_MODELS || "").trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ["llama3-70b-8192", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
}

/**
 * @param {Array<{ provider: string, capability_type: string, external_id: string, name: string, metadata?: object, is_active?: boolean }>} rows
 */
async function upsertCapabilities(rows) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "supabase_not_configured", upserted: 0 };
  }
  const clean = rows.filter((r) => r.provider && r.capability_type && r.external_id);
  if (!clean.length) return { ok: true, upserted: 0 };

  const chunkSize = 80;
  let total = 0;
  for (let i = 0; i < clean.length; i += chunkSize) {
    const chunk = clean.slice(i, i + chunkSize).map((r) => ({
      provider: String(r.provider),
      capability_type: String(r.capability_type),
      external_id: String(r.external_id),
      name: String(r.name || r.external_id || "").slice(0, 500),
      metadata: r.metadata && typeof r.metadata === "object" ? r.metadata : {},
      is_active: r.is_active !== false,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("ai_capabilities").upsert(chunk, {
      onConflict: "provider,external_id",
    });
    if (error) {
      return {
        ok: false,
        error: formatCapabilityDbError(error),
        upserted: total,
      };
    }
    total += chunk.length;
  }
  return { ok: true, upserted: total };
}

async function fetchElevenLabsVoices() {
  const key = String(process.env.ELEVENLABS_API_KEY || "").trim();
  if (!key) {
    console.warn("[discovery_worker] ElevenLabs: sin ELEVENLABS_API_KEY — omitido.");
    return [];
  }
  const res = await axios.get("https://api.elevenlabs.io/v1/voices", {
    timeout: Number(process.env.DISCOVERY_TIMEOUT_MS || 20000),
    validateStatus: () => true,
    headers: { "xi-api-key": key },
  });
  if (res.status < 200 || res.status >= 300) {
    console.warn("[discovery_worker] ElevenLabs HTTP", res.status);
    return [];
  }
  const voices = Array.isArray(res.data?.voices) ? res.data.voices : [];
  return voices.map((v) => {
    const labels = v.labels && typeof v.labels === "object" ? v.labels : {};
    return {
      provider: "elevenlabs",
      capability_type: "voice",
      external_id: String(v.voice_id || v.voiceId || "").trim(),
      name: String(v.name || v.voice_id || "voice").trim(),
      metadata: {
        labels,
        category: v.category || null,
        description: v.description || null,
        preview_url: v.preview_url || null,
        source: "discovery_worker",
      },
      is_active: true,
    };
  }).filter((r) => r.external_id);
}

async function fetchOpenAiTextModels() {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) {
    console.warn("[discovery_worker] OpenAI: sin OPENAI_API_KEY — omitido.");
    return [];
  }
  const res = await axios.get("https://api.openai.com/v1/models", {
    timeout: Number(process.env.DISCOVERY_TIMEOUT_MS || 20000),
    validateStatus: () => true,
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.status < 200 || res.status >= 300) {
    console.warn("[discovery_worker] OpenAI HTTP", res.status);
    return [];
  }
  const data = Array.isArray(res.data?.data) ? res.data.data : [];
  const rows = [];
  for (const m of data) {
    const id = String(m.id || "").toLowerCase();
    if (!id) continue;
    if (!id.includes("gpt-4") && !id.includes("gpt-3.5")) continue;
    rows.push({
      provider: "openai",
      capability_type: "text_model",
      external_id: String(m.id),
      name: String(m.id),
      metadata: {
        object: m.object || null,
        owned_by: m.owned_by || null,
        source: "discovery_worker",
      },
      is_active: true,
    });
  }
  return rows;
}

function buildGroqRows() {
  const models = readGroqStaticModels();
  return models.map((id) => ({
    provider: "groq",
    capability_type: "text_model",
    external_id: id,
    name: id,
    metadata: { source: "discovery_worker", discovery: "static_or_env" },
    is_active: true,
  }));
}

/**
 * Sincroniza el catálogo con ElevenLabs, OpenAI (modelos GPT) y Groq (lista estática/env).
 * No lanza si faltan keys: autosanación por omisión + log.
 * @returns {Promise<{ ok: boolean, summary: string, counts: object, detail?: string }>}
 */
async function syncCapabilities() {
  const counts = { elevenlabs: 0, openai: 0, groq: 0, upserted: 0 };
  const errors = [];

  try {
    const elRows = await fetchElevenLabsVoices();
    counts.elevenlabs = elRows.length;
    const elUpsert = await upsertCapabilities(elRows);
    if (!elUpsert.ok) errors.push(`elevenlabs: ${elUpsert.error}`);
    else counts.upserted += elUpsert.upserted || 0;
  } catch (e) {
    errors.push(`elevenlabs: ${e?.message || String(e)}`);
  }

  try {
    const oaRows = await fetchOpenAiTextModels();
    counts.openai = oaRows.length;
    const oaUpsert = await upsertCapabilities(oaRows);
    if (!oaUpsert.ok) errors.push(`openai: ${oaUpsert.error}`);
    else counts.upserted += oaUpsert.upserted || 0;
  } catch (e) {
    errors.push(`openai: ${e?.message || String(e)}`);
  }

  try {
    const gqRows = buildGroqRows();
    counts.groq = gqRows.length;
    const gqUpsert = await upsertCapabilities(gqRows);
    if (!gqUpsert.ok) errors.push(`groq: ${gqUpsert.error}`);
    else counts.upserted += gqUpsert.upserted || 0;
  } catch (e) {
    errors.push(`groq: ${e?.message || String(e)}`);
  }

  const summary = `voices=${counts.elevenlabs} openai_models=${counts.openai} groq_models=${counts.groq} upserted_total=${counts.upserted}`;
  if (errors.length) {
    console.warn("[discovery_worker] Advertencias:", errors.join("; "));
  } else {
    console.log(`🔭 Discovery Worker: ${summary}`);
  }

  return {
    ok: errors.length === 0,
    summary,
    counts,
    detail: errors.length ? errors.join("; ") : undefined,
  };
}

/**
 * Lectura para API (selectores UI).
 * @param {{ type?: string, provider?: string }} filters
 */
async function listAiCapabilities(filters = {}) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "supabase_not_configured", data: [] };
  }
  const type = String(filters.type || "").trim();
  const provider = String(filters.provider || "").trim();
  let q = supabase
    .from("ai_capabilities")
    .select("id,provider,capability_type,external_id,name,metadata,is_active,updated_at,requires_pro")
    .eq("is_active", true);
  if (provider) q = q.eq("provider", provider);
  if (type) q = q.eq("capability_type", type);
  const { data, error } = await q.order("provider", { ascending: true }).order("name", { ascending: true });
  if (error) return { ok: false, error: formatCapabilityDbError(error), data: [] };
  return { ok: true, data: data || [] };
}

/**
 * Catálogo completo para el Curador (voces + modelos de texto).
 * @returns {Promise<Array<object>>}
 */
async function fetchCapabilitiesForCurator() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ai_capabilities")
    .select("id,provider,capability_type,external_id,name,metadata,is_active,updated_at,requires_pro")
    .eq("is_active", true);
  if (error) {
    console.warn("[discovery_worker] fetchCapabilitiesForCurator:", formatCapabilityDbError(error));
    return [];
  }
  return Array.isArray(data) ? data : [];
}

module.exports = {
  syncCapabilities,
  upsertCapabilities,
  listAiCapabilities,
  fetchCapabilitiesForCurator,
  getSupabaseServiceClient,
};
