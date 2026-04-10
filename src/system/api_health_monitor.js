/**
 * API Health Monitor — pings a proveedores OSS/agregadores y APIs premium/propietarias; persiste en
 * `fifer_platform.api_health_status`.
 *
 * Reglas: sin API key → unconfigured; timeout o 5xx → offline; latencia 2xx → degraded si supera umbral
 * (2000 ms general; 3000 ms voz TTS/STT — listados de voces/proyectos; 4000 ms imagen; 5000 ms video).
 * Enterprise (Bedrock/Azure): sin región/endpoint corporativo → unconfigured con mensaje fijo.
 * @see supabase/migrations/20260408210000_api_health_status.sql
 */
const axios = require("axios");
const crypto = require("crypto");
const https = require("https");
const { createClient } = require("@supabase/supabase-js");

const DEFAULT_PLATFORM_DB_SCHEMA = "fifer_platform";
const DEGRADED_LATENCY_MS = 2000;
/** Umbral degradado exclusivo para proveedores de generación de imagen (listados / APIs lentas). */
const DEGRADED_LATENCY_MS_IMAGE = 4000;
/** Umbral degradado para generación de video (listados y colas más lentas). */
const DEGRADED_LATENCY_MS_VIDEO = 5000;
/** Umbral degradado para APIs de voz (listado de voces / proyectos; la síntesis puede ser más lenta). */
const DEGRADED_LATENCY_MS_VOICE = 3000;
const REQUEST_TIMEOUT_MS = Number(process.env.API_HEALTH_TIMEOUT_MS || 12000);
const PING_INTERVAL_MS = 15 * 60 * 1000;

const ENTERPRISE_UNCONFIGURED_MSG = "Requiere configuración de IAM/Endpoint corporativo";
const VIDEO_ENTERPRISE_WEB_MSG = "Requiere configuración Enterprise/Web";
const ANTHROPIC_API_VERSION = String(process.env.ANTHROPIC_API_VERSION || "2023-06-01").trim();

function resolvePlatformDbSchema() {
  let s = String(process.env.FIFER_PLATFORM_SCHEMA || DEFAULT_PLATFORM_DB_SCHEMA).trim();
  if (s === "fiferr_platform") s = DEFAULT_PLATFORM_DB_SCHEMA;
  return s || DEFAULT_PLATFORM_DB_SCHEMA;
}

const PLATFORM_DB_SCHEMA = resolvePlatformDbSchema();

let _supabase = null;

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

function firstEnv(...keys) {
  for (const k of keys) {
    const v = String(process.env[k] || "").trim();
    if (v) return v;
  }
  return "";
}

function truncateError(msg, max = 4000) {
  const s = String(msg || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function amzTimestamp(d = new Date()) {
  const iso = d.toISOString();
  const [datePart, timePart] = iso.split("T");
  const ymd = datePart.replace(/-/g, "");
  const hms = timePart.replace(/\.\d{3}Z$/, "Z").replace(/:/g, "");
  return `${ymd}T${hms}`;
}

function sha256HexUtf8(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function hmacSha256(key, data) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function getAws4SigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

/**
 * GET firmado SigV4 (payload vacío) hacia API de control de Bedrock.
 */
function awsSignedBedrockGet({ host, canonicalPath, canonicalQuery, region, accessKeyId, secretAccessKey, sessionToken }) {
  const service = "bedrock";
  const xAmzDate = amzTimestamp();
  const dateStamp = xAmzDate.slice(0, 8);
  const payloadHash = sha256HexUtf8("");

  const headers = {
    host,
    "x-amz-date": xAmzDate,
  };
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;

  const signedHeaderNames = Object.keys(headers).map((k) => k.toLowerCase()).sort();
  const canonicalHeaderBlock = signedHeaderNames
    .map((name) => {
      const origKey = Object.keys(headers).find((k) => k.toLowerCase() === name);
      return `${name}:${String(headers[origKey]).trim()}\n`;
    })
    .join("");

  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    "GET",
    canonicalPath,
    canonicalQuery,
    canonicalHeaderBlock,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    xAmzDate,
    credentialScope,
    sha256HexUtf8(canonicalRequest),
  ].join("\n");

  const signingKey = getAws4SigningKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const reqHeaders = {
    Host: host,
    "X-Amz-Date": xAmzDate,
    Authorization: authorization,
  };
  if (sessionToken) reqHeaders["X-Amz-Security-Token"] = sessionToken;

  const pathWithQuery = canonicalQuery ? `${canonicalPath}?${canonicalQuery}` : canonicalPath;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: host,
        path: pathWithQuery,
        method: "GET",
        headers: reqHeaders,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({ statusCode: res.statusCode || 0, body });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(Object.assign(new Error("timeout"), { code: "ECONNABORTED" }));
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Clasifica respuesta HTTP (misma autosanación que ping HTTP estándar).
 * @param {number} [degradedThresholdMs=DEGRADED_LATENCY_MS] Umbral latencia 2xx → degraded.
 */
function classifyHttpRow(provider_name, statusCode, latency_ms, resData, nowIso, degradedThresholdMs = DEGRADED_LATENCY_MS) {
  if (statusCode >= 500) {
    return {
      provider_name,
      status: "offline",
      latency_ms,
      last_error: truncateError(
        `HTTP ${statusCode}: ${typeof resData === "string" ? resData : JSON.stringify(resData).slice(0, 500)}`
      ),
      last_checked_at: nowIso,
    };
  }

  if (statusCode === 408 || statusCode === 504) {
    return {
      provider_name,
      status: "offline",
      latency_ms,
      last_error: `HTTP ${statusCode} (timeout/gateway)`,
      last_checked_at: nowIso,
    };
  }

  if (statusCode >= 400) {
    return {
      provider_name,
      status: "offline",
      latency_ms,
      last_error: truncateError(
        `HTTP ${statusCode}: ${typeof resData === "string" ? resData : resData ? JSON.stringify(resData).slice(0, 200) : "client error"}`
      ),
      last_checked_at: nowIso,
    };
  }

  if (latency_ms > degradedThresholdMs) {
    return {
      provider_name,
      status: "degraded",
      latency_ms,
      last_error: null,
      last_checked_at: nowIso,
    };
  }

  return {
    provider_name,
    status: "online",
    latency_ms,
    last_error: null,
    last_checked_at: nowIso,
  };
}

function catchProbeError(provider_name, err, started, nowIso) {
  const latency_ms = Date.now() - started;
  const code = err && err.code;
  const isTimeout =
    code === "ECONNABORTED" ||
    (err.message && /timeout/i.test(err.message)) ||
    (axios.isAxiosError(err) && err.response?.status === 408);

  if (isTimeout) {
    return {
      provider_name,
      status: "offline",
      latency_ms,
      last_error: truncateError("timeout"),
      last_checked_at: nowIso,
    };
  }

  const httpStatus = axios.isAxiosError(err) ? err.response?.status : null;
  if (httpStatus && httpStatus >= 500) {
    return {
      provider_name,
      status: "offline",
      latency_ms,
      last_error: truncateError(`HTTP ${httpStatus}: ${err.message || "server error"}`),
      last_checked_at: nowIso,
    };
  }

  return {
    provider_name,
    status: "offline",
    latency_ms,
    last_error: truncateError(err?.message || String(err)),
    last_checked_at: nowIso,
  };
}

async function pingAmazonBedrock(_cfg) {
  const nowIso = new Date().toISOString();
  const provider_name = "AWS Bedrock";
  const region = firstEnv("AWS_REGION");
  if (!region) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: ENTERPRISE_UNCONFIGURED_MSG,
      last_checked_at: nowIso,
    };
  }
  const accessKeyId = firstEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = firstEnv("AWS_SECRET_ACCESS_KEY");
  if (!accessKeyId || !secretAccessKey) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: ENTERPRISE_UNCONFIGURED_MSG,
      last_checked_at: nowIso,
    };
  }
  const sessionToken = firstEnv("AWS_SESSION_TOKEN");
  const host = `bedrock.${region}.amazonaws.com`;
  const started = Date.now();
  try {
    const res = await awsSignedBedrockGet({
      host,
      canonicalPath: "/foundation-models",
      canonicalQuery: "maxResults=1",
      region,
      accessKeyId,
      secretAccessKey,
      sessionToken,
    });
    const latency_ms = Date.now() - started;
    return classifyHttpRow(provider_name, res.statusCode, latency_ms, res.body, nowIso);
  } catch (err) {
    return catchProbeError(provider_name, err, started, nowIso);
  }
}

async function pingAzureOpenAI(_cfg) {
  const nowIso = new Date().toISOString();
  const provider_name = "Azure OpenAI";
  const endpoint = firstEnv("AZURE_OPENAI_ENDPOINT").replace(/\/+$/, "");
  if (!endpoint) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: ENTERPRISE_UNCONFIGURED_MSG,
      last_checked_at: nowIso,
    };
  }
  const apiKey = firstEnv("AZURE_OPENAI_API_KEY", "AZURE_OPENAI_KEY");
  if (!apiKey) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: "Missing API Key",
      last_checked_at: nowIso,
    };
  }
  const apiVersion = firstEnv("AZURE_OPENAI_API_VERSION") || "2023-05-15";
  const url = `${endpoint}/openai/deployments?api-version=${encodeURIComponent(apiVersion)}`;
  const started = Date.now();
  try {
    const res = await axios({
      method: "GET",
      url,
      headers: { "api-key": apiKey },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });
    const latency_ms = Date.now() - started;
    return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso);
  } catch (err) {
    return catchProbeError(provider_name, err, started, nowIso);
  }
}

function togetherListingSuggestsImageModels(data) {
  if (data == null) return true;
  try {
    const raw = typeof data === "string" ? data : JSON.stringify(data);
    if (/flux|sdxl|stable-diffusion|image|diffusion|dall-e|playground|vision|multimodal/i.test(raw)) {
      return true;
    }
    const items = Array.isArray(data) ? data : data.data;
    if (!Array.isArray(items)) return true;
    return items.some((m) => {
      const s = JSON.stringify(m).toLowerCase();
      return /image|diffusion|flux|sdxl|vision|multimodal/.test(s);
    });
  } catch {
    return true;
  }
}

/**
 * Together: mismo listado /v1/models; si 2xx y rápido, exige señales de modelos de imagen en el JSON.
 */
async function pingTogetherImageFleet(cfg = {}) {
  const degradedMs = cfg.degradedLatencyMs ?? DEGRADED_LATENCY_MS_IMAGE;
  const nowIso = new Date().toISOString();
  const provider_name = "Together AI (image)";
  const apiKey = firstEnv("TOGETHER_API_KEY");
  if (!apiKey) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: "Missing API Key",
      last_checked_at: nowIso,
    };
  }
  const started = Date.now();
  try {
    const res = await axios({
      method: "GET",
      url: "https://api.together.xyz/v1/models",
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });
    const latency_ms = Date.now() - started;
    const statusCode = res.status;
    const base = classifyHttpRow(provider_name, statusCode, latency_ms, res.data, nowIso, degradedMs);
    if (base.status === "online" && statusCode >= 200 && statusCode < 300 && !togetherListingSuggestsImageModels(res.data)) {
      return {
        provider_name,
        status: "degraded",
        latency_ms,
        last_error: "Listado sin modelos de imagen reconocibles",
        last_checked_at: nowIso,
      };
    }
    return base;
  } catch (err) {
    return catchProbeError(provider_name, err, started, nowIso);
  }
}

/**
 * Hugging Face (general): GET Inference API sobre `{model_id}`; si 400/405 (solo POST soportado), un POST mínimo de salud.
 */
async function pingHuggingFaceGeneral(_cfg) {
  const nowIso = new Date().toISOString();
  const provider_name = "Hugging Face";
  const apiKey = firstEnv("HUGGINGFACE_API_TOKEN", "HF_TOKEN");
  if (!apiKey) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: "Missing API Key",
      last_checked_at: nowIso,
    };
  }
  const modelId = firstEnv("HF_INFERENCE_MODEL_ID", "HF_MODEL_ID") || "gpt2";
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
  const started = Date.now();

  try {
    let res = await axios({
      method: "GET",
      url,
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });
    let latency_ms = Date.now() - started;

    if (res.status >= 200 && res.status < 300) {
      return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso);
    }

    if (res.status === 400 || res.status === 405) {
      const postStart = Date.now();
      res = await axios({
        method: "POST",
        url,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        data: { inputs: "ok" },
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
      });
      latency_ms = Date.now() - postStart;
    }

    return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso);
  } catch (err) {
    return catchProbeError(provider_name, err, started, nowIso);
  }
}

/**
 * fal (general): intenta listado en fal.run; si no responde 2xx, usa Platform API documentada.
 */
async function pingFalGeneral(_cfg) {
  const nowIso = new Date().toISOString();
  const provider_name = "fal";
  const apiKey = firstEnv("FAL_KEY", "FAL_API_KEY");
  if (!apiKey) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: "Missing API Key",
      last_checked_at: nowIso,
    };
  }

  const attempts = [
    {
      url: "https://fal.run/models",
      headers: { Authorization: `Key ${apiKey}` },
    },
    {
      url: "https://api.fal.ai/v1/models?limit=1",
      headers: { Authorization: `Key ${apiKey}` },
    },
  ];

  let last = { status: 0, latency_ms: 0, data: null };

  for (const a of attempts) {
    const started = Date.now();
    try {
      const res = await axios({
        method: "GET",
        url: a.url,
        headers: a.headers,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
      });
      const latency_ms = Date.now() - started;
      last = { status: res.status, latency_ms, data: res.data };
      if (res.status >= 200 && res.status < 300) {
        return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso);
      }
    } catch (err) {
      const latency_ms = Date.now() - started;
      last = { status: 0, latency_ms, data: err?.message || String(err) };
      const row = catchProbeError(provider_name, err, started, nowIso);
      if (attempts.indexOf(a) < attempts.length - 1) continue;
      return row;
    }
  }

  return classifyHttpRow(provider_name, last.status, last.latency_ms, last.data, nowIso);
}

/**
 * fal (image): prioriza fal.run/models con Bearer; fallback Key y Platform API.
 */
async function pingFalImageFleet(cfg = {}) {
  const degradedMs = cfg.degradedLatencyMs ?? DEGRADED_LATENCY_MS_IMAGE;
  const nowIso = new Date().toISOString();
  const provider_name = "fal (image)";
  const apiKey = firstEnv("FAL_KEY", "FAL_API_KEY");
  if (!apiKey) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: "Missing API Key",
      last_checked_at: nowIso,
    };
  }

  const attempts = [
    { url: "https://fal.run/models", headers: { Authorization: `Bearer ${apiKey}` } },
    { url: "https://fal.run/models", headers: { Authorization: `Key ${apiKey}` } },
    {
      url: "https://api.fal.ai/v1/models?endpoint_id=fal-ai%2Fflux%2Fdev",
      headers: { Authorization: `Key ${apiKey}` },
    },
  ];

  let last = { status: 0, latency_ms: 0, data: null };

  for (const a of attempts) {
    const started = Date.now();
    try {
      const res = await axios({
        method: "GET",
        url: a.url,
        headers: a.headers,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
      });
      const latency_ms = Date.now() - started;
      last = { status: res.status, latency_ms, data: res.data };
      if (res.status >= 200 && res.status < 300) {
        return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso, degradedMs);
      }
    } catch (err) {
      const latency_ms = Date.now() - started;
      last = { status: 0, latency_ms, data: err?.message || String(err) };
      const row = catchProbeError(provider_name, err, started, nowIso);
      if (attempts.indexOf(a) < attempts.length - 1) continue;
      return row;
    }
  }

  return classifyHttpRow(provider_name, last.status, last.latency_ms, last.data, nowIso, degradedMs);
}

/**
 * fal (video): mismo patrón de status/listado que fal general; fila aparte para dashboard (`fal_video`).
 */
async function pingFalVideoFleet(cfg = {}) {
  const degradedMs = cfg.degradedLatencyMs ?? DEGRADED_LATENCY_MS_VIDEO;
  const nowIso = new Date().toISOString();
  const provider_name = "fal (video)";
  const apiKey = firstEnv("FAL_KEY", "FAL_API_KEY");
  if (!apiKey) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: "Missing API Key",
      last_checked_at: nowIso,
    };
  }

  const attempts = [
    { url: "https://fal.run/models", headers: { Authorization: `Bearer ${apiKey}` } },
    { url: "https://fal.run/models", headers: { Authorization: `Key ${apiKey}` } },
    {
      url: "https://api.fal.ai/v1/models?limit=1",
      headers: { Authorization: `Key ${apiKey}` },
    },
  ];

  let last = { status: 0, latency_ms: 0, data: null };

  for (const a of attempts) {
    const started = Date.now();
    try {
      const res = await axios({
        method: "GET",
        url: a.url,
        headers: a.headers,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
      });
      const latency_ms = Date.now() - started;
      last = { status: res.status, latency_ms, data: res.data };
      if (res.status >= 200 && res.status < 300) {
        return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso, degradedMs);
      }
    } catch (err) {
      const latency_ms = Date.now() - started;
      last = { status: 0, latency_ms, data: err?.message || String(err) };
      const row = catchProbeError(provider_name, err, started, nowIso);
      if (attempts.indexOf(a) < attempts.length - 1) continue;
      return row;
    }
  }

  return classifyHttpRow(provider_name, last.status, last.latency_ms, last.data, nowIso, degradedMs);
}

/**
 * Runway: host oficial `api.dev.runwayml.com` + `X-Runway-Version`; fallback a URL legacy si aplica.
 */
async function pingRunway(cfg = {}) {
  const degradedMs = cfg.degradedLatencyMs ?? DEGRADED_LATENCY_MS_VIDEO;
  const nowIso = new Date().toISOString();
  const provider_name = "Runway";
  const key = firstEnv("RUNWAYML_API_SECRET", "RUNWAY_API_KEY");
  if (!key) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: "Missing API Key",
      last_checked_at: nowIso,
    };
  }
  const version = firstEnv("RUNWAY_API_VERSION", "X_RUNWAY_VERSION") || "2024-11-06";
  const attempts = [
    {
      url: "https://api.dev.runwayml.com/v1/organization",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": version,
      },
    },
    {
      url: "https://api.runwayml.com/v1/models",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": version,
      },
    },
  ];

  let last = { status: 0, latency_ms: 0, data: null };
  for (const a of attempts) {
    const started = Date.now();
    try {
      const res = await axios({
        method: "GET",
        url: a.url,
        headers: a.headers,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
      });
      const latency_ms = Date.now() - started;
      last = { status: res.status, latency_ms, data: res.data };
      if (res.status >= 200 && res.status < 300) {
        return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso, degradedMs);
      }
    } catch (err) {
      const row = catchProbeError(provider_name, err, started, nowIso);
      if (attempts.indexOf(a) < attempts.length - 1) continue;
      return row;
    }
  }
  return classifyHttpRow(provider_name, last.status, last.latency_ms, last.data, nowIso, degradedMs);
}

/**
 * Luma Dream Machine: listado de generaciones (GET + Bearer).
 */
async function pingLuma(cfg = {}) {
  const degradedMs = cfg.degradedLatencyMs ?? DEGRADED_LATENCY_MS_VIDEO;
  const nowIso = new Date().toISOString();
  const provider_name = "Luma";
  const key = firstEnv("LUMA_API_KEY", "LUMA_LABS_API_KEY");
  if (!key) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: "Missing API Key",
      last_checked_at: nowIso,
    };
  }
  const started = Date.now();
  try {
    const res = await axios({
      method: "GET",
      url: "https://api.lumalabs.ai/dream-machine/v1/generations",
      headers: { Authorization: `Bearer ${key}` },
      params: { limit: 1 },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });
    const latency_ms = Date.now() - started;
    return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso, degradedMs);
  } catch (err) {
    return catchProbeError(provider_name, err, started, nowIso);
  }
}

/** Pika / Kling: sin API pública estable documentada para ping ligero. */
async function pingVideoEnterpriseStub(cfg = {}) {
  const nowIso = new Date().toISOString();
  const provider_name = cfg.provider_name || "Unknown";
  return {
    provider_name,
    status: "unconfigured",
    latency_ms: null,
    last_error: VIDEO_ENTERPRISE_WEB_MSG,
    last_checked_at: nowIso,
  };
}

/**
 * Adobe Firefly: sin token + API key de desarrollador → unconfigured (pendiente credenciales).
 * Con `ADOBE_FIREFLY_ACCESS_TOKEN` + `ADOBE_FIREFLY_API_KEY` (client id) intenta GET /v2/account.
 */
async function pingAdobeFirefly(cfg = {}) {
  const degradedMs = cfg.degradedLatencyMs ?? DEGRADED_LATENCY_MS_IMAGE;
  const nowIso = new Date().toISOString();
  const provider_name = "Adobe Firefly";
  const token = firstEnv("ADOBE_FIREFLY_ACCESS_TOKEN", "ADOBE_ACCESS_TOKEN");
  const apiKey = firstEnv("ADOBE_FIREFLY_API_KEY", "ADOBE_CLIENT_ID", "FIREFLY_CLIENT_ID");
  if (!token || !apiKey) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error:
        "Pendiente: credenciales Adobe IMS (access token) + x-api-key / client id Firefly. Ver Adobe Developer.",
      last_checked_at: nowIso,
    };
  }
  const started = Date.now();
  try {
    const res = await axios({
      method: "GET",
      url: "https://firefly-api.adobe.io/v2/account",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": apiKey,
      },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });
    const latency_ms = Date.now() - started;
    return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso, degradedMs);
  } catch (err) {
    return catchProbeError(provider_name, err, started, nowIso);
  }
}

const VOICE_UNCONFIGURED_MSG = "Falta Auth Key";

/**
 * PlayHT v2: requiere `Authorization` (Bearer + secret) y `X-User-ID` (dashboard API Access).
 */
async function pingPlayHt(cfg = {}) {
  const degradedMs = cfg.degradedLatencyMs ?? DEGRADED_LATENCY_MS_VOICE;
  const nowIso = new Date().toISOString();
  const provider_name = "PlayHT";
  const secret = firstEnv("PLAYHT_API_KEY", "PLAYHT_SECRET_KEY");
  const userId = firstEnv("PLAYHT_USER_ID", "PLAYHT_X_USER_ID");
  if (!secret || !userId) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: VOICE_UNCONFIGURED_MSG,
      last_checked_at: nowIso,
    };
  }
  const auth = /^Bearer\s+/i.test(secret) ? secret.trim() : `Bearer ${secret.trim()}`;
  const started = Date.now();
  try {
    const res = await axios({
      method: "GET",
      url: "https://api.play.ht/api/v2/voices",
      headers: {
        Authorization: auth,
        "X-User-ID": userId.trim(),
      },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });
    const latency_ms = Date.now() - started;
    return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso, degradedMs);
  } catch (err) {
    return catchProbeError(provider_name, err, started, nowIso);
  }
}

/**
 * Voyage AI: `GET https://api.voyageai.com/v1/models` no está expuesto (404). Healthcheck vía `POST /v1/embeddings` mínimo.
 * Override opcional: `VOYAGE_HEALTH_EMBED_MODEL` (default `voyage-3.5-lite`).
 */
async function pingVoyageAi(cfg = {}) {
  const degradedMs = cfg.degradedLatencyMs ?? DEGRADED_LATENCY_MS;
  const nowIso = new Date().toISOString();
  const provider_name = "Voyage AI";
  const key = firstEnv("VOYAGE_API_KEY");
  if (!key) {
    return {
      provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: "Missing API Key",
      last_checked_at: nowIso,
    };
  }
  const model = String(process.env.VOYAGE_HEALTH_EMBED_MODEL || "voyage-3.5-lite").trim() || "voyage-3.5-lite";
  const started = Date.now();
  try {
    const res = await axios({
      method: "POST",
      url: "https://api.voyageai.com/v1/embeddings",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      data: { input: "ping", model },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });
    const latency_ms = Date.now() - started;
    return classifyHttpRow(provider_name, res.status, latency_ms, res.data, nowIso, degradedMs);
  } catch (err) {
    return catchProbeError(provider_name, err, started, nowIso);
  }
}

/**
 * Proveedores: 8 generales + 5 imagen OSS + 3 video OSS + 8 premium texto + 5 imagen premium + 5 video premium + 4 voz
 * = 38 filas en `api_health_status` (incl. DeepSeek general y Voyage embeddings).
 * Claves .env documentadas en `.env.example` (cuando aplique).
 */
const PROVIDER_CONFIG = [
  {
    provider_name: "Hugging Face",
    customPing: pingHuggingFaceGeneral,
  },
  {
    provider_name: "OpenRouter",
    envKeys: ["OPENROUTER_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://openrouter.ai/api/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "Groq",
    envKeys: ["GROQ_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.groq.com/openai/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "Together AI",
    envKeys: ["TOGETHER_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.together.xyz/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "Replicate",
    envKeys: ["REPLICATE_API_TOKEN"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.replicate.com/v1/models",
      headers: { Authorization: `Token ${key}` },
    }),
  },
  {
    provider_name: "fal",
    customPing: pingFalGeneral,
  },
  {
    provider_name: "Fireworks AI",
    envKeys: ["FIREWORKS_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.fireworks.ai/inference/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "DeepSeek",
    envKeys: ["DEEPSEEK_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.deepseek.com/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  /* —— Imágenes (OSS / abiertas) —— Listados ligeros o metadatos de modelo imagen */
  {
    provider_name: "Stability AI",
    degradedLatencyMs: DEGRADED_LATENCY_MS_IMAGE,
    envKeys: ["STABILITY_API_KEY", "STABILITY_API_TOKEN"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.stability.ai/v1/engines/list",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "Hugging Face Diffusers",
    degradedLatencyMs: DEGRADED_LATENCY_MS_IMAGE,
    envKeys: ["HUGGINGFACE_API_TOKEN", "HF_TOKEN"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://huggingface.co/api/models?pipeline_tag=text-to-image&limit=5",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "fal (image)",
    degradedLatencyMs: DEGRADED_LATENCY_MS_IMAGE,
    customPing: pingFalImageFleet,
  },
  {
    provider_name: "Replicate (image)",
    degradedLatencyMs: DEGRADED_LATENCY_MS_IMAGE,
    envKeys: ["REPLICATE_API_TOKEN"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.replicate.com/v1/models",
      headers: { Authorization: `Token ${key}` },
    }),
  },
  {
    provider_name: "Together AI (image)",
    degradedLatencyMs: DEGRADED_LATENCY_MS_IMAGE,
    envKeys: ["TOGETHER_API_KEY"],
    customPing: pingTogetherImageFleet,
  },
  /* —— Video (OSS / abiertas) —— Umbral degradado 5s */
  {
    provider_name: "fal (video)",
    degradedLatencyMs: DEGRADED_LATENCY_MS_VIDEO,
    customPing: pingFalVideoFleet,
  },
  {
    provider_name: "Replicate (video)",
    degradedLatencyMs: DEGRADED_LATENCY_MS_VIDEO,
    envKeys: ["REPLICATE_API_TOKEN"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.replicate.com/v1/models",
      headers: { Authorization: `Token ${key}` },
    }),
  },
  {
    provider_name: "Hugging Face (video)",
    degradedLatencyMs: DEGRADED_LATENCY_MS_VIDEO,
    envKeys: ["HUGGINGFACE_API_TOKEN", "HF_TOKEN"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://huggingface.co/api/models?pipeline_tag=text-to-video&limit=5",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  /* —— Premium / propietarias —— */
  {
    provider_name: "OpenAI",
    envKeys: ["OPENAI_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.openai.com/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "Anthropic",
    envKeys: ["ANTHROPIC_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.anthropic.com/v1/models",
      headers: {
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
    }),
  },
  {
    provider_name: "Google Gemini",
    envKeys: ["GOOGLE_AI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    }),
  },
  {
    provider_name: "Cohere",
    envKeys: ["COHERE_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.cohere.ai/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "Voyage AI",
    customPing: pingVoyageAi,
  },
  {
    provider_name: "xAI",
    envKeys: ["XAI_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.x.ai/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "AWS Bedrock",
    customPing: pingAmazonBedrock,
  },
  {
    provider_name: "Azure OpenAI",
    customPing: pingAzureOpenAI,
  },
  /* —— Imagen premium / creative (SDK o APIs pesadas; umbral degradado 4s) —— */
  {
    provider_name: "OpenAI Images",
    degradedLatencyMs: DEGRADED_LATENCY_MS_IMAGE,
    envKeys: ["OPENAI_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.openai.com/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "Google Imagen",
    degradedLatencyMs: DEGRADED_LATENCY_MS_IMAGE,
    envKeys: ["GOOGLE_AI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    }),
  },
  {
    provider_name: "Adobe Firefly",
    degradedLatencyMs: DEGRADED_LATENCY_MS_IMAGE,
    customPing: pingAdobeFirefly,
  },
  {
    provider_name: "Leonardo AI",
    degradedLatencyMs: DEGRADED_LATENCY_MS_IMAGE,
    envKeys: ["LEONARDO_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://cloud.leonardo.ai/api/rest/v1/me",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    provider_name: "Ideogram",
    degradedLatencyMs: DEGRADED_LATENCY_MS_IMAGE,
    envKeys: ["IDEOGRAM_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.ideogram.ai/v1/credits",
      headers: { "Api-Key": key },
    }),
  },
  /* —— Video premium —— */
  {
    provider_name: "Runway",
    degradedLatencyMs: DEGRADED_LATENCY_MS_VIDEO,
    customPing: pingRunway,
  },
  {
    provider_name: "Luma",
    degradedLatencyMs: DEGRADED_LATENCY_MS_VIDEO,
    customPing: pingLuma,
  },
  {
    provider_name: "Pika",
    customPing: pingVideoEnterpriseStub,
  },
  {
    provider_name: "Kling",
    customPing: pingVideoEnterpriseStub,
  },
  {
    provider_name: "Google Veo",
    degradedLatencyMs: DEGRADED_LATENCY_MS_VIDEO,
    envKeys: ["GOOGLE_AI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    }),
  },
  /* —— Voz (TTS / STT) —— Listados ligeros; umbral degradado 3 s */
  {
    provider_name: "ElevenLabs",
    degradedLatencyMs: DEGRADED_LATENCY_MS_VOICE,
    unconfiguredMessage: VOICE_UNCONFIGURED_MSG,
    envKeys: ["ELEVENLABS_API_KEY", "XI_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.elevenlabs.io/v1/voices",
      headers: { "xi-api-key": key },
    }),
  },
  {
    provider_name: "Deepgram",
    degradedLatencyMs: DEGRADED_LATENCY_MS_VOICE,
    unconfiguredMessage: VOICE_UNCONFIGURED_MSG,
    envKeys: ["DEEPGRAM_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.deepgram.com/v1/projects",
      headers: { Authorization: `Token ${key}` },
    }),
  },
  {
    provider_name: "AssemblyAI",
    degradedLatencyMs: DEGRADED_LATENCY_MS_VOICE,
    unconfiguredMessage: VOICE_UNCONFIGURED_MSG,
    envKeys: ["ASSEMBLYAI_API_KEY"],
    buildRequest: (key) => ({
      method: "GET",
      url: "https://api.assemblyai.com/v2/transcript?limit=1",
      headers: { Authorization: key },
    }),
  },
  {
    provider_name: "PlayHT",
    degradedLatencyMs: DEGRADED_LATENCY_MS_VOICE,
    customPing: pingPlayHt,
  },
];

/**
 * @returns {Promise<{ provider_name: string, status: string, latency_ms: number | null, last_error: string | null, last_checked_at: string }>}
 */
async function pingProvider(cfg) {
  const nowIso = new Date().toISOString();
  if (typeof cfg.customPing === "function") {
    return cfg.customPing(cfg);
  }

  const apiKey = firstEnv(...cfg.envKeys);

  if (!apiKey) {
    return {
      provider_name: cfg.provider_name,
      status: "unconfigured",
      latency_ms: null,
      last_error: cfg.unconfiguredMessage || "Missing API Key",
      last_checked_at: nowIso,
    };
  }

  const req = cfg.buildRequest(apiKey);
  const started = Date.now();

  try {
    const res = await axios({
      ...req,
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    });
    const latency_ms = Date.now() - started;
    const statusCode = res.status;
    const bodyForMsg =
      typeof res.data === "string"
        ? res.data
        : res.data !== undefined
          ? res.data
          : res.statusText || "client error";
    const degradedMs = cfg.degradedLatencyMs != null ? cfg.degradedLatencyMs : DEGRADED_LATENCY_MS;
    return classifyHttpRow(cfg.provider_name, statusCode, latency_ms, bodyForMsg, nowIso, degradedMs);
  } catch (err) {
    return catchProbeError(cfg.provider_name, err, started, nowIso);
  }
}

/**
 * Ejecuta un ciclo completo de pings y upsert en base de datos.
 * @returns {Promise<{ ok: boolean, upserted: number, detail?: string }>}
 */
async function runHealthCheckCycle() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, upserted: 0, detail: "supabase_not_configured" };
  }

  const rows = [];
  for (const cfg of PROVIDER_CONFIG) {
    const row = await pingProvider(cfg);
    rows.push(row);
  }

  const { error } = await supabase.from("api_health_status").upsert(rows, {
    onConflict: "provider_name",
  });

  if (error) {
    console.warn("[api_health_monitor] upsert failed:", error.message || String(error));
    return { ok: false, upserted: 0, detail: error.message || "upsert_failed" };
  }

  return { ok: true, upserted: rows.length };
}

let _intervalHandle = null;

/**
 * Arranca un ciclo inmediato y repite cada 15 minutos (no bloquea boot).
 */
function startApiHealthMonitorBackground() {
  if (_intervalHandle) return;
  void runHealthCheckCycle().catch((err) => {
    console.warn("[api_health_monitor] initial cycle:", err?.message || String(err));
  });
  _intervalHandle = setInterval(() => {
    void runHealthCheckCycle().catch((err) => {
      console.warn("[api_health_monitor] interval cycle:", err?.message || String(err));
    });
  }, PING_INTERVAL_MS);
}

/**
 * Lectura para Master API (service role).
 * @returns {Promise<{ ok: boolean, data?: object[], error?: string }>}
 */
async function listApiHealthStatus() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "supabase_not_configured" };
  }
  const { data, error } = await supabase
    .from("api_health_status")
    .select("provider_name,status,latency_ms,last_error,last_checked_at")
    .order("provider_name", { ascending: true });

  if (error) {
    return { ok: false, error: error.message || "query_failed" };
  }
  return { ok: true, data: data || [] };
}

module.exports = {
  PROVIDER_CONFIG,
  runHealthCheckCycle,
  startApiHealthMonitorBackground,
  listApiHealthStatus,
  pingProvider,
  DEGRADED_LATENCY_MS,
  DEGRADED_LATENCY_MS_IMAGE,
  DEGRADED_LATENCY_MS_VIDEO,
  DEGRADED_LATENCY_MS_VOICE,
  PING_INTERVAL_MS,
};
