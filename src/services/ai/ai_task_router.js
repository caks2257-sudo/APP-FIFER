/**
 * Smart Task Router — enrutador central por tipo de tarea con failover según `fifer_platform.api_health_status`.
 * Usa adaptadores existentes (`groq_adapter`, `openai_adapter`) y ejecutores HTTP alineados al monitor de salud.
 * Tras éxito, registra costo vs baseline premium en `fifer_finance.ai_usage_logs` (Cost Savings Tracker).
 *
 * @see src/system/api_health_monitor.js (nombres canónicos de `provider_name`)
 * @see supabase/migrations/20260409120000_ai_usage_logs.sql
 */
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const { listApiHealthStatus } = require("../../system/api_health_monitor.js");
const groqAdapter = require("./groq_adapter.js");
const openaiAdapter = require("./openai_adapter.js");

const userProfileRepoPath = path.join(__dirname, "../../modules/fifer-platform/auth/userProfileRepository.js");
const byokVaultPath = path.join(__dirname, "../../modules/fifer-platform/auth/byokVault.js");

const FINANCE_DB_SCHEMA = "fifer_finance";
let _financeSupabase = null;

function getFinanceSupabaseClient() {
  if (_financeSupabase) return _financeSupabase;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  _financeSupabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: FINANCE_DB_SCHEMA },
  });
  return _financeSupabase;
}

/**
 * Tarifas aproximadas USD por 1k tokens (input+output mezclado, orientativas SaaS).
 * Baseline texto = costo si todo fuera “premium” OpenAI/Claude (~GPT-4o tier).
 */
const BASELINE_USD_PER_1K_TEXT = Number(process.env.AI_BASELINE_USD_PER_1K_TEXT || 0.01);
/** Baseline imagen = equivalente ~1 generación DALL·E 3 estándar. */
const BASELINE_USD_PER_IMAGE = Number(process.env.AI_BASELINE_USD_PER_IMAGE || 0.042);
/** Baseline video = equivalente ~1 clip corto premium (Runway-like). */
const BASELINE_USD_PER_VIDEO_UNIT = Number(process.env.AI_BASELINE_USD_PER_VIDEO || 0.35);

/** Costo efectivo por 1k tokens según proveedor usado (texto). */
const ACTUAL_USD_PER_1K_TEXT = {
  Anthropic: Number(process.env.AI_RATE_ANTHROPIC_PER_1K || 0.006),
  "Google Gemini": Number(process.env.AI_RATE_GEMINI_PER_1K || 0.0002),
  OpenAI: Number(process.env.AI_RATE_OPENAI_PER_1K || 0.0005),
  Groq: Number(process.env.AI_RATE_GROQ_PER_1K || 0.0001),
  fal: Number(process.env.AI_RATE_FAL_TEXT_PER_1K || 0.0002),
  OpenRouter: Number(process.env.AI_RATE_OPENROUTER_PER_1K || 0.001),
  DeepSeek: Number(process.env.AI_RATE_DEEPSEEK_PER_1K || 0.00014),
  "Hugging Face": Number(process.env.AI_RATE_HF_PER_1K || 0.00015),
};

const ACTUAL_USD_PER_IMAGE = {
  "fal (image)": Number(process.env.AI_RATE_FAL_IMAGE || 0.0035),
  "Replicate (image)": Number(process.env.AI_RATE_REPLICATE_IMAGE || 0.0025),
};

const ACTUAL_USD_PER_VIDEO = {
  Runway: Number(process.env.AI_RATE_RUNWAY_VIDEO || 0.25),
  "fal (video)": Number(process.env.AI_RATE_FAL_VIDEO || 0.06),
};

const TEXT_TASK_TYPES = new Set(["complex_reasoning", "speed_generation", "low_cost"]);

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_ROUTER_TIMEOUT_MS || 120000);
const ANTHROPIC_API_VERSION = String(process.env.ANTHROPIC_API_VERSION || "2023-06-01").trim();

/** Estados del monitor considerados ejecutables (degraded sigue aceptando tráfico con latencia alta). */
const USABLE_HEALTH = new Set(["online", "degraded"]);

/**
 * Stack ideal por tipo de tarea (orden = prioridad). Nombres = `provider_name` en `api_health_status`.
 */
const ROUTING_CHAINS = {
  complex_reasoning: ["Anthropic", "Google Gemini", "OpenAI"],
  speed_generation: ["Groq", "fal", "OpenRouter"],
  low_cost: ["DeepSeek", "Hugging Face"],
  image_generation: ["fal (image)", "Replicate (image)"],
  video_generation: ["Runway", "fal (video)"],
};

/** Free tier sin BYOK: razonamiento complejo → DeepSeek; video premium (Runway) → Hunyuan (fal video). */
const FREE_TIER_DOWNGRADE_CHAINS = {
  complex_reasoning: ["DeepSeek"],
  video_generation: ["fal (video)"],
};

const TASK_TYPES = new Set(Object.keys(ROUTING_CHAINS));

/**
 * @param {{ userId?: string | null, userTier?: 'free'|'pro'|null }} ctx
 * @returns {Promise<{ userId: string, effectiveTier: 'free'|'pro', downgrade: boolean, byok: { openai: boolean, anthropic: boolean } }>}
 */
async function resolveTierRoutingContext(ctx = {}) {
  const userId = ctx.userId != null ? String(ctx.userId).trim() : "";
  const explicit = ctx.userTier;
  const hasExplicit = explicit === "pro" || explicit === "free";

  if (!userId && !hasExplicit) {
    return {
      userId: "",
      effectiveTier: "pro",
      downgrade: false,
      byok: { openai: false, anthropic: false },
    };
  }

  const { getUserSubscriptionProfile } = require(userProfileRepoPath);
  const { hasVaultProviderKey } = require(byokVaultPath);

  let tier = "free";
  if (hasExplicit) {
    tier = explicit;
  } else if (userId) {
    const prof = await getUserSubscriptionProfile(userId);
    tier = prof.tier === "pro" ? "pro" : "free";
  } else {
    tier = "pro";
  }

  let byokOpenai = false;
  let byokAnthropic = false;
  if (userId) {
    byokOpenai = await hasVaultProviderKey(userId, "openai");
    byokAnthropic = await hasVaultProviderKey(userId, "anthropic");
  }

  const byokUnlocksPremium = byokOpenai || byokAnthropic;
  const downgrade = tier === "free" && !byokUnlocksPremium;

  return {
    userId,
    effectiveTier: tier,
    downgrade,
    byok: { openai: byokOpenai, anthropic: byokAnthropic },
  };
}

/**
 * @param {Map<string, string>|null} healthMap provider_name -> status lowercased
 * @param {string} providerName
 */
function isProviderUsable(healthMap, providerName) {
  if (!healthMap || !(healthMap instanceof Map)) return true;
  const st = healthMap.get(providerName);
  if (st === undefined) return true;
  return USABLE_HEALTH.has(st);
}

/**
 * @returns {Promise<Map<string, string>>}
 */
async function buildHealthIndex() {
  const res = await listApiHealthStatus();
  if (!res.ok || !Array.isArray(res.data)) {
    return new Map();
  }
  const m = new Map();
  for (const row of res.data) {
    const name = String(row.provider_name || "").trim();
    if (!name) continue;
    m.set(name, String(row.status || "").toLowerCase());
  }
  return m;
}

function textFromPayload(payload) {
  if (payload == null) return "";
  if (typeof payload === "string") return payload.trim();
  return String(payload.prompt ?? payload.text ?? "").trim();
}

function adapterOptionsFromPayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  const o = {};
  if (payload.apiKey) o.apiKey = payload.apiKey;
  if (payload.encryptedApiKey) o.encryptedApiKey = payload.encryptedApiKey;
  if (payload.model) o.model = payload.model;
  if (Number.isFinite(Number(payload.temperature))) o.temperature = Number(payload.temperature);
  if (Number.isFinite(Number(payload.max_tokens))) o.max_tokens = Number(payload.max_tokens);
  if (Array.isArray(payload.messages)) o.messages = payload.messages;
  return o;
}

async function runAnthropic(payload) {
  const key = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) {
    return { ok: false, status: 503, data: null, error: "ANTHROPIC_API_KEY not configured" };
  }
  const prompt = textFromPayload(payload);
  if (!prompt) {
    return { ok: false, status: 400, data: null, error: "missing_prompt" };
  }
  const model = String(payload?.model || process.env.ANTHROPIC_ROUTER_MODEL || "claude-3-5-sonnet-20241022").trim();
  const maxTokens = Number.isFinite(Number(payload?.max_tokens)) ? Number(payload.max_tokens) : 1024;
  try {
    const res = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      },
      {
        timeout: DEFAULT_TIMEOUT_MS,
        validateStatus: () => true,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": ANTHROPIC_API_VERSION,
        },
      }
    );
    const status = res.status;
    if (status < 200 || status >= 300) {
      return { ok: false, status, data: null, error: `anthropic_http_${status}` };
    }
    const text = String(res.data?.content?.[0]?.text ?? "").trim();
    return {
      ok: true,
      status,
      data: { text, model: res.data?.model || model, provider: "anthropic", raw: res.data },
      error: null,
    };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

async function runGoogleGemini(payload) {
  const key =
    String(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (!key) {
    return { ok: false, status: 503, data: null, error: "GEMINI/GOOGLE_AI_API_KEY not configured" };
  }
  const prompt = textFromPayload(payload);
  if (!prompt) {
    return { ok: false, status: 400, data: null, error: "missing_prompt" };
  }
  const modelId = String(payload?.model || process.env.GEMINI_ROUTER_MODEL || "gemini-2.0-flash").replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(key)}`;
  try {
    const res = await axios.post(
      url,
      { contents: [{ parts: [{ text: prompt }] }] },
      {
        timeout: DEFAULT_TIMEOUT_MS,
        validateStatus: () => true,
        headers: { "Content-Type": "application/json" },
      }
    );
    const status = res.status;
    if (status < 200 || status >= 300) {
      return { ok: false, status, data: null, error: `gemini_http_${status}` };
    }
    const text = String(res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    return {
      ok: true,
      status,
      data: { text, model: modelId, provider: "google_gemini", raw: res.data },
      error: null,
    };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

async function runOpenAICompat(url, providerLabel, payload, extraHeaders = {}) {
  const prompt = textFromPayload(payload);
  if (!prompt) {
    return { ok: false, status: 400, data: null, error: "missing_prompt" };
  }
  const key = String(payload?.apiKey || "").trim();
  const envMap = {
    deepseek: "DEEPSEEK_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    huggingface: "HUGGINGFACE_API_TOKEN",
  };
  const envKey = envMap[providerLabel] ? String(process.env[envMap[providerLabel]] || "").trim() : "";
  const hfFallback =
    providerLabel === "huggingface" ? String(process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || "").trim() : "";
  const apiKey = key || envKey || hfFallback;
  if (!apiKey) {
    const hint =
      providerLabel === "huggingface"
        ? "HUGGINGFACE_API_TOKEN or HF_TOKEN not configured"
        : `${envMap[providerLabel] || "API_KEY"} not configured`;
    return { ok: false, status: 503, data: null, error: hint };
  }
  const model =
    String(
      payload?.model ||
        (providerLabel === "deepseek"
          ? process.env.DEEPSEEK_ROUTER_MODEL || "deepseek-chat"
          : providerLabel === "openrouter"
            ? process.env.OPENROUTER_ROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct"
            : process.env.HF_CHAT_MODEL || "Qwen/Qwen2.5-7B-Instruct")
    ).trim();
  const body = {
    model,
    messages: Array.isArray(payload?.messages) ? payload.messages : [{ role: "user", content: prompt }],
    temperature: Number.isFinite(Number(payload?.temperature)) ? Number(payload.temperature) : 0.3,
    max_tokens: Number.isFinite(Number(payload?.max_tokens)) ? Number(payload.max_tokens) : 1024,
  };
  try {
    const res = await axios.post(url, body, {
      timeout: DEFAULT_TIMEOUT_MS,
      validateStatus: () => true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
    });
    const status = res.status;
    if (status < 200 || status >= 300) {
      return { ok: false, status, data: null, error: `${providerLabel}_http_${status}` };
    }
    const text = String(res.data?.choices?.[0]?.message?.content ?? "").trim();
    return {
      ok: true,
      status,
      data: { text, model: res.data?.model || model, provider: providerLabel, usage: res.data?.usage, raw: res.data },
      error: null,
    };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

function falKey() {
  return String(process.env.FAL_KEY || process.env.FAL_API_KEY || "").trim();
}

async function runFalText(payload) {
  const key = falKey();
  if (!key) {
    return { ok: false, status: 503, data: null, error: "FAL_KEY not configured" };
  }
  const path = String(process.env.FAL_TEXT_MODEL_PATH || "fal-ai/llama-3.2-3b-instruct").trim();
  const prompt = textFromPayload(payload);
  if (!prompt) {
    return { ok: false, status: 400, data: null, error: "missing_prompt" };
  }
  const url = `https://fal.run/${path.replace(/^\//, "")}`;
  try {
    const res = await axios.post(
      url,
      { input: { prompt } },
      {
        timeout: DEFAULT_TIMEOUT_MS,
        validateStatus: () => true,
        headers: {
          Authorization: `Key ${key}`,
          "Content-Type": "application/json",
        },
      }
    );
    const status = res.status;
    if (status < 200 || status >= 300) {
      return { ok: false, status, data: null, error: `fal_text_http_${status}` };
    }
    const data = res.data;
    const text = String(data?.output ?? data?.text ?? data?.data?.text ?? JSON.stringify(data)).trim();
    return {
      ok: true,
      status,
      data: { text, model: path, provider: "fal_text", raw: data },
      error: null,
    };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

async function runFalFluxImage(payload) {
  const key = falKey();
  if (!key) {
    return { ok: false, status: 503, data: null, error: "FAL_KEY not configured" };
  }
  const path = String(process.env.FAL_IMAGE_MODEL_PATH || "fal-ai/flux/schnell").trim();
  const prompt = textFromPayload(payload);
  if (!prompt) {
    return { ok: false, status: 400, data: null, error: "missing_prompt" };
  }
  const url = `https://fal.run/${path.replace(/^\//, "")}`;
  try {
    const res = await axios.post(
      url,
      { input: { prompt, ...((payload && payload.fal_input) || {}) } },
      {
        timeout: DEFAULT_TIMEOUT_MS,
        validateStatus: () => true,
        headers: {
          Authorization: `Key ${key}`,
          "Content-Type": "application/json",
        },
      }
    );
    const status = res.status;
    if (status < 200 || status >= 300) {
      return { ok: false, status, data: null, error: `fal_image_http_${status}` };
    }
    return {
      ok: true,
      status,
      data: {
        images: res.data?.images ?? res.data?.output?.images ?? res.data?.image,
        provider: "fal_image",
        raw: res.data,
      },
      error: null,
    };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

let _replicateFluxVersionCache = null;

async function runReplicateImage(payload) {
  const token = String(process.env.REPLICATE_API_TOKEN || "").trim();
  if (!token) {
    return { ok: false, status: 503, data: null, error: "REPLICATE_API_TOKEN not configured" };
  }
  const prompt = textFromPayload(payload);
  if (!prompt) {
    return { ok: false, status: 400, data: null, error: "missing_prompt" };
  }
  let version = String(process.env.REPLICATE_FLUX_SCHNELL_VERSION || "").trim();
  try {
    if (!version) {
      if (!_replicateFluxVersionCache) {
        const meta = await axios.get("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell", {
          headers: { Authorization: `Token ${token}` },
          timeout: 30000,
          validateStatus: () => true,
        });
        if (meta.status < 200 || meta.status >= 300) {
          return { ok: false, status: meta.status, data: null, error: "replicate_model_meta_failed" };
        }
        _replicateFluxVersionCache = String(meta.data?.latest_version?.id || "").trim();
      }
      version = _replicateFluxVersionCache;
    }
    if (!version) {
      return { ok: false, status: 503, data: null, error: "replicate_flux_version_unresolved" };
    }
    const res = await axios.post(
      "https://api.replicate.com/v1/predictions",
      {
        version,
        input: { prompt, ...((payload && payload.replicate_input) || {}) },
      },
      {
        timeout: DEFAULT_TIMEOUT_MS,
        validateStatus: () => true,
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
      }
    );
    const status = res.status;
    if (status < 200 || status >= 300) {
      return { ok: false, status, data: null, error: `replicate_http_${status}` };
    }
    return {
      ok: true,
      status,
      data: { output: res.data?.output, provider: "replicate_image", raw: res.data },
      error: null,
    };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

async function runRunwayVideo(payload) {
  const key = String(process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_KEY || "").trim();
  if (!key) {
    return { ok: false, status: 503, data: null, error: "RUNWAY_API_KEY not configured" };
  }
  const prompt = textFromPayload(payload);
  if (!prompt) {
    return { ok: false, status: 400, data: null, error: "missing_prompt" };
  }
  const version = String(process.env.RUNWAY_API_VERSION || "2024-11-06").trim();
  const url = String(process.env.RUNWAY_VIDEO_TASKS_URL || "https://api.dev.runwayml.com/v1/tasks").trim();
  const body = {
    taskType: payload?.runway_task_type || "text_to_video",
    internalTaskType: payload?.runway_internal_type,
    options: {
      text_prompt: prompt,
      ...(payload?.runway_options && typeof payload.runway_options === "object" ? payload.runway_options : {}),
    },
  };
  try {
    const res = await axios.post(url, body, {
      timeout: DEFAULT_TIMEOUT_MS,
      validateStatus: () => true,
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": version,
        "Content-Type": "application/json",
      },
    });
    const status = res.status;
    if (status < 200 || status >= 300) {
      return { ok: false, status, data: null, error: `runway_http_${status}`, raw: res.data };
    }
    return {
      ok: true,
      status,
      data: { task: res.data, provider: "runway", raw: res.data },
      error: null,
    };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

async function runFalHunyuanVideo(payload) {
  const key = falKey();
  if (!key) {
    return { ok: false, status: 503, data: null, error: "FAL_KEY not configured" };
  }
  const path = String(process.env.FAL_VIDEO_MODEL_PATH || "fal-ai/hunyuan-video").trim();
  const prompt = textFromPayload(payload);
  if (!prompt) {
    return { ok: false, status: 400, data: null, error: "missing_prompt" };
  }
  const url = `https://fal.run/${path.replace(/^\//, "")}`;
  try {
    const res = await axios.post(
      url,
      { input: { prompt, ...((payload && payload.fal_video_input) || {}) } },
      {
        timeout: DEFAULT_TIMEOUT_MS,
        validateStatus: () => true,
        headers: {
          Authorization: `Key ${key}`,
          "Content-Type": "application/json",
        },
      }
    );
    const status = res.status;
    if (status < 200 || status >= 300) {
      return { ok: false, status, data: null, error: `fal_video_http_${status}` };
    }
    return {
      ok: true,
      status,
      data: { video: res.data?.video ?? res.data?.output, provider: "fal_video", raw: res.data },
      error: null,
    };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

function roundUsd(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 1e8) / 1e8;
}

function estimateTokensFallback(payload, execResult) {
  const p = textFromPayload(payload);
  const inT = Math.max(64, Math.ceil(p.length / 4));
  const txt = execResult?.data?.text || "";
  const outT = Math.max(128, Math.ceil(String(txt).length / 4));
  return { inputTokens: inT, outputTokens: outT, totalTokens: inT + outT };
}

/**
 * @param {object} execResult resultado de executeProvider
 * @param {string} taskType
 * @param {object} payload
 * @returns {{ mode: string, tokens_or_units?: number, inputTokens?: number, outputTokens?: number, totalTokens?: number }}
 */
function extractUsageStats(execResult, taskType, payload) {
  if (taskType === "image_generation") {
    return { mode: "image", tokens_or_units: 1 };
  }
  if (taskType === "video_generation") {
    return { mode: "video", tokens_or_units: 1 };
  }

  const d = execResult?.data;
  const raw = d?.raw && typeof d.raw === "object" ? d.raw : {};
  const usage = d?.usage || raw.usage || raw.usageMetadata || null;

  let inputTokens = 0;
  let outputTokens = 0;

  if (usage && typeof usage === "object") {
    inputTokens =
      Number(usage.prompt_tokens ?? usage.input_tokens ?? usage.promptTokenCount ?? usage.prompt_tokens_total ?? 0) ||
      0;
    outputTokens =
      Number(
        usage.completion_tokens ?? usage.output_tokens ?? usage.candidatesTokenCount ?? usage.completion_tokens_total ?? 0
      ) || 0;
    const total = Number(usage.total_tokens ?? usage.totalTokenCount ?? 0) || 0;
    if (total > 0 && inputTokens + outputTokens < 8) {
      inputTokens = Math.max(1, Math.floor(total * 0.45));
      outputTokens = Math.max(1, total - inputTokens);
    }
  }

  if (inputTokens + outputTokens < 8) {
    const fb = estimateTokensFallback(payload, execResult);
    inputTokens = fb.inputTokens;
    outputTokens = fb.outputTokens;
  }

  const totalTokens = inputTokens + outputTokens;
  return {
    mode: "text",
    inputTokens,
    outputTokens,
    totalTokens,
    tokens_or_units: totalTokens,
  };
}

function computeCosts(taskType, provider, usageStats) {
  if (usageStats.mode === "image") {
    const units = Math.max(1, Number(usageStats.tokens_or_units) || 1);
    const baseline = roundUsd(BASELINE_USD_PER_IMAGE * units);
    const rate = ACTUAL_USD_PER_IMAGE[provider] ?? baseline * 0.35;
    const actual = roundUsd(rate * units);
    return { tokens_or_units: units, actual_cost: actual, baseline_cost: baseline };
  }
  if (usageStats.mode === "video") {
    const units = Math.max(1, Number(usageStats.tokens_or_units) || 1);
    const baseline = roundUsd(BASELINE_USD_PER_VIDEO_UNIT * units);
    const rate = ACTUAL_USD_PER_VIDEO[provider] ?? baseline * 0.45;
    const actual = roundUsd(rate * units);
    return { tokens_or_units: units, actual_cost: actual, baseline_cost: baseline };
  }

  const totalTok = Math.max(1, Number(usageStats.totalTokens) || 1);
  const k = totalTok / 1000;
  const baseline = roundUsd(BASELINE_USD_PER_1K_TEXT * k);
  const ratePer1k = ACTUAL_USD_PER_1K_TEXT[provider];
  const fallbackRate = BASELINE_USD_PER_1K_TEXT * 0.5;
  const actual = roundUsd((ratePer1k != null ? ratePer1k : fallbackRate) * k);
  return {
    tokens_or_units: Math.round(totalTok),
    actual_cost: actual,
    baseline_cost: baseline,
  };
}

/**
 * Persiste una fila en `fifer_finance.ai_usage_logs` (savings generado en BD).
 * @param {string} taskType
 * @param {string} provider — `provider_name` del monitor
 * @param {object} usageStats — salida de extractUsageStats
 */
async function logTaskCost(taskType, provider, usageStats) {
  if (
    !TEXT_TASK_TYPES.has(taskType) &&
    taskType !== "image_generation" &&
    taskType !== "video_generation"
  ) {
    return { ok: false, skipped: true, reason: "unknown_task_type" };
  }
  const supabase = getFinanceSupabaseClient();
  if (!supabase) {
    return { ok: false, skipped: true, reason: "supabase_not_configured" };
  }
  const { tokens_or_units, actual_cost, baseline_cost } = computeCosts(taskType, provider, usageStats);
  const { error } = await supabase.from("ai_usage_logs").insert({
    task_type: String(taskType),
    provider_used: String(provider),
    tokens_or_units: Math.max(0, Math.floor(Number(tokens_or_units) || 0)),
    actual_cost,
    baseline_cost,
  });
  if (error) {
    return { ok: false, error: error.message || String(error) };
  }
  return { ok: true };
}

/**
 * Ahorro acumulado del mes calendario UTC actual, agrupado por task_type (dashboard).
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
async function getCostSavingsCurrentMonth() {
  const supabase = getFinanceSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "supabase_not_configured", data: null };
  }
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("task_type, savings, baseline_cost, actual_cost")
    .gte("created_at", start.toISOString());

  if (error) {
    return { ok: false, error: error.message || "query_failed", data: null };
  }

  let totalBaseline = 0;
  let totalActual = 0;
  const byType = {};
  for (const row of data || []) {
    const t = String(row.task_type || "unknown");
    const s = Number(row.savings || 0);
    byType[t] = (byType[t] || 0) + s;
    totalBaseline += Number(row.baseline_cost || 0);
    totalActual += Number(row.actual_cost || 0);
  }

  const by_task_type = Object.entries(byType).map(([task_type, total_savings]) => ({
    task_type,
    total_savings: roundUsd(total_savings),
  }));

  const total_savings_month = roundUsd(totalBaseline - totalActual);
  const optimization_pct_of_baseline =
    totalBaseline > 0 ? Math.round((total_savings_month / totalBaseline) * 1000) / 10 : 0;

  return {
    ok: true,
    data: {
      month_utc: start.toISOString().slice(0, 7),
      period_start_utc: start.toISOString(),
      total_savings_month,
      total_baseline_month: roundUsd(totalBaseline),
      total_actual_month: roundUsd(totalActual),
      optimization_pct_of_baseline,
      by_task_type,
    },
  };
}

/**
 * @param {string} providerName — clave monitor (`provider_name`)
 * @param {string} taskType
 * @param {object} payload
 * @returns {Promise<{ ok: boolean, status: number, data: object | null, error: string | null }>}
 */
async function executeProvider(providerName, taskType, payload) {
  const opts = adapterOptionsFromPayload(payload);
  switch (providerName) {
    case "Anthropic":
      return runAnthropic({ ...payload, ...opts });
    case "Google Gemini":
      return runGoogleGemini({ ...payload, ...opts });
    case "OpenAI":
      return openaiAdapter.generateText(textFromPayload(payload) || " ", opts);
    case "Groq":
      return groqAdapter.generateText(textFromPayload(payload) || " ", opts);
    case "fal":
      return runFalText({ ...payload, ...opts });
    case "OpenRouter":
      return runOpenAICompat("https://openrouter.ai/api/v1/chat/completions", "openrouter", { ...payload, ...opts }, {
        "HTTP-Referer": String(process.env.OPENROUTER_HTTP_REFERER || "https://fifer.app").trim(),
        "X-Title": "FIFER Smart Task Router",
      });
    case "DeepSeek":
      return runOpenAICompat("https://api.deepseek.com/v1/chat/completions", "deepseek", { ...payload, ...opts });
    case "Hugging Face":
      return runOpenAICompat(
        "https://router.huggingface.co/v1/chat/completions",
        "huggingface",
        { ...payload, ...opts }
      );
    case "fal (image)":
      return runFalFluxImage({ ...payload, ...opts });
    case "Replicate (image)":
      return runReplicateImage({ ...payload, ...opts });
    case "Runway":
      return runRunwayVideo({ ...payload, ...opts });
    case "fal (video)":
      return runFalHunyuanVideo({ ...payload, ...opts });
    default:
      return { ok: false, status: 501, data: null, error: `no_executor_for_provider:${providerName}` };
  }
}

/**
 * Enruta y ejecuta la tarea contra el primer proveedor sano del stack; si falla la ejecución, intenta el siguiente.
 *
 * @param {keyof typeof ROUTING_CHAINS} taskType
 * @param {object} [payload] prompt/text/messages + opciones de adaptador
 * @param {{ userId?: string | null, userTier?: 'free'|'pro' }} [routingContext] — tier desde BD o explícito; BYOK (OpenAI/Anthropic en vault) evita downgrade en `free`.
 * @returns {Promise<{
 *   ok: boolean,
 *   routed_via: string | null,
 *   status: number,
 *   data: object | null,
 *   error: string | null,
 *   routing: { taskType: string, tried: Array<{ provider: string, skipped?: string, execution?: object }> }
 * }>}
 */
async function routeTask(taskType, payload = {}, routingContext = {}) {
  const baseChain = ROUTING_CHAINS[taskType];
  if (!baseChain) {
    return {
      ok: false,
      routed_via: null,
      status: 400,
      data: null,
      error: `invalid_task_type:${taskType}. Expected one of: ${[...TASK_TYPES].join(", ")}`,
      routing: { taskType: String(taskType), tried: [] },
    };
  }

  const tierCtx = await resolveTierRoutingContext(routingContext);
  let chain = [...baseChain];
  let tierDowngradeApplied = false;

  if (tierCtx.downgrade && FREE_TIER_DOWNGRADE_CHAINS[taskType]) {
    tierDowngradeApplied = true;
    chain = [...FREE_TIER_DOWNGRADE_CHAINS[taskType]];
    console.warn(
      `[ai_task_router] Tier Downgrade: taskType=${String(taskType)} userId=${tierCtx.userId || "n/a"} tier=free ` +
        `byok_openai=${tierCtx.byok.openai} byok_anthropic=${tierCtx.byok.anthropic} → chain=${chain.join(",")}`
    );
  }

  const healthMap = await buildHealthIndex();
  const tried = [];

  for (const provider of chain) {
    if (!isProviderUsable(healthMap, provider)) {
      const reason = healthMap?.get(provider) || "not_in_health_table";
      tried.push({ provider, skipped: `health:${reason}` });
      continue;
    }

    const execResult = await executeProvider(provider, taskType, payload);
    tried.push({
      provider,
      execution: {
        ok: execResult.ok,
        status: execResult.status,
        error: execResult.error,
      },
    });

    if (execResult.ok) {
      const via = provider;
      const usageStats = extractUsageStats(execResult, taskType, payload);
      void logTaskCost(taskType, via, usageStats).catch((err) => {
        console.warn("[ai_task_router] logTaskCost:", err?.message || String(err));
      });
      return {
        ok: true,
        routed_via: via,
        status: execResult.status,
        data: {
          ...(execResult.data && typeof execResult.data === "object" ? execResult.data : {}),
          routed_via: via,
        },
        error: null,
        routing: {
          taskType,
          tried,
          tier: tierCtx.effectiveTier,
          tier_downgrade: tierDowngradeApplied,
          byok: tierCtx.byok,
        },
      };
    }
  }

  const last = tried[tried.length - 1];
  const errMsg = last?.execution?.error || last?.skipped || "all_providers_failed";
  return {
    ok: false,
    routed_via: null,
    status: last?.execution?.status || 503,
    data: null,
    error: errMsg,
    routing: {
      taskType,
      tried,
      tier: tierCtx.effectiveTier,
      tier_downgrade: tierDowngradeApplied,
      byok: tierCtx.byok,
    },
  };
}

module.exports = {
  routeTask,
  resolveTierRoutingContext,
  buildHealthIndex,
  ROUTING_CHAINS,
  FREE_TIER_DOWNGRADE_CHAINS,
  isProviderUsable,
  executeProvider,
  TASK_TYPES,
  logTaskCost,
  extractUsageStats,
  computeCosts,
  getCostSavingsCurrentMonth,
  getFinanceSupabaseClient,
};
