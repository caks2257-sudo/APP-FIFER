const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const { getEngineByTier } = require("../../../config/ai_engines.js");
const { encrypt, decrypt } = require("../../../utils/encryption.js");

const ALLOWED_PROVIDERS = new Set(["openai", "anthropic", "google", "groq", "elevenlabs"]);
let _supabase = null;
/** @type {Map<string, { api_key: string, ts: number }>} */
const KEY_CACHE = new Map();
const KEY_CACHE_TTL_MS = 5 * 60 * 1000;

function getSupabaseServiceClient() {
  if (_supabase) return _supabase;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabase;
}

function normalizeProvider(provider) {
  const p = String(provider || "").trim().toLowerCase();
  if (!p) return "";
  if (p.includes("+")) return p.split("+")[0];
  return p;
}

function encryptApiKey(plainText) {
  return encrypt(String(plainText || ""));
}

function decryptApiKey(cipherText) {
  return decrypt(String(cipherText || ""));
}

function maskKey(input) {
  const s = String(input || "");
  if (s.length <= 8) return "****";
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

function buildCacheKey(userId, provider) {
  return `${String(userId || "").trim()}:${normalizeProvider(provider)}`;
}

function readCachedKey(userId, provider) {
  const k = buildCacheKey(userId, provider);
  const hit = KEY_CACHE.get(k);
  if (!hit) return null;
  if (Date.now() - Number(hit.ts || 0) > KEY_CACHE_TTL_MS) {
    KEY_CACHE.delete(k);
    return null;
  }
  return hit.api_key;
}

function writeCachedKey(userId, provider, apiKey) {
  const k = buildCacheKey(userId, provider);
  KEY_CACHE.set(k, { api_key: String(apiKey || ""), ts: Date.now() });
}

function invalidateCachedKey(userId, provider) {
  const k = buildCacheKey(userId, provider);
  KEY_CACHE.delete(k);
}

async function listUserApiKeys(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .schema("fifer_auth")
    .from("user_api_keys")
    .select("id,provider,encrypted_key,created_at,updated_at")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false });
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => {
    let masked = "****";
    try {
      masked = maskKey(decryptApiKey(row.encrypted_key));
    } catch {
      masked = "****";
    }
    return {
      id: row.id,
      provider: row.provider,
      masked_key: masked,
      created_at: row.created_at,
      updated_at: row.updated_at,
      connected: true,
    };
  });
}

async function upsertUserApiKey(userId, provider, apiKey) {
  const uid = String(userId || "").trim();
  const p = normalizeProvider(provider);
  const key = String(apiKey || "").trim();
  if (!uid) return { ok: false, error: "missing_user_id" };
  if (!ALLOWED_PROVIDERS.has(p)) return { ok: false, error: "invalid_provider" };
  if (!key) return { ok: false, error: "missing_api_key" };
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { ok: false, error: "supabase_not_configured" };
  const encrypted = encryptApiKey(key);
  const payload = {
    user_id: uid,
    provider: p,
    encrypted_key: encrypted,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .schema("fifer_auth")
    .from("user_api_keys")
    .upsert(payload, { onConflict: "user_id,provider" })
    .select("id,provider,updated_at")
    .maybeSingle();
  if (error) return { ok: false, error: error.message || "db_error" };
  invalidateCachedKey(uid, p);
  return { ok: true, data };
}

async function getUserProviderApiKey(userId, provider) {
  const uid = String(userId || "").trim();
  const p = normalizeProvider(provider);
  if (!uid || !ALLOWED_PROVIDERS.has(p)) return null;
  const cached = readCachedKey(uid, p);
  if (cached) {
    return { ok: true, api_key: cached, error: null, source: "cache" };
  }
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .schema("fifer_auth")
    .from("user_api_keys")
    .select("encrypted_key")
    .eq("user_id", uid)
    .eq("provider", p)
    .maybeSingle();
  if (error || !data?.encrypted_key) return null;
  try {
    const plain = decryptApiKey(data.encrypted_key);
    writeCachedKey(uid, p, plain);
    return { ok: true, api_key: plain, error: null, source: "db" };
  } catch (err) {
    return {
      ok: false,
      api_key: null,
      error: "DECRYPTION_FAILED",
      detail: err?.message || String(err),
    };
  }
}

async function deleteUserApiKey(userId, provider) {
  const uid = String(userId || "").trim();
  const p = normalizeProvider(provider);
  if (!uid) return { ok: false, error: "missing_user_id" };
  if (!ALLOWED_PROVIDERS.has(p)) return { ok: false, error: "invalid_provider" };
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  // Ownership enforced by compound filter user_id + provider.
  const { error, count } = await supabase
    .schema("fifer_auth")
    .from("user_api_keys")
    .delete({ count: "exact" })
    .eq("user_id", uid)
    .eq("provider", p);
  if (error) return { ok: false, error: error.message || "db_delete_failed" };

  // Wipe cache immediately after DB deletion.
  invalidateCachedKey(uid, p);
  return { ok: true, provider: p, deleted: Number(count || 0) > 0 };
}

async function testProviderKey(provider, apiKey) {
  const p = normalizeProvider(provider);
  const key = String(apiKey || "").trim();
  if (!ALLOWED_PROVIDERS.has(p)) return { ok: false, error: "invalid_provider" };
  if (!key) return { ok: false, error: "missing_api_key" };
  try {
    if (p === "openai") {
      const res = await axios.get("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 8000,
        validateStatus: () => true,
      });
      return { ok: res.status >= 200 && res.status < 300, status: res.status };
    }
    if (p === "anthropic") {
      const res = await axios.get("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        timeout: 8000,
        validateStatus: () => true,
      });
      return { ok: res.status >= 200 && res.status < 300, status: res.status };
    }
    if (p === "google") {
      const res = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        { timeout: 8000, validateStatus: () => true }
      );
      return { ok: res.status >= 200 && res.status < 300, status: res.status };
    }
    if (p === "groq") {
      const res = await axios.get("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 8000,
        validateStatus: () => true,
      });
      return { ok: res.status >= 200 && res.status < 300, status: res.status };
    }
    if (p === "elevenlabs") {
      const res = await axios.get("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": key },
        timeout: 8000,
        validateStatus: () => true,
      });
      return { ok: res.status >= 200 && res.status < 300, status: res.status };
    }
    return { ok: false, error: "unsupported_provider" };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

function resolveProviderFromEngineTier(engineTier) {
  const eng = getEngineByTier(engineTier);
  if (!eng?.vendor) return null;
  return normalizeProvider(eng.vendor);
}

async function resolveByokRouting(options = {}) {
  const userId = String(options.user_id || "").trim();
  const useUserKey = options.use_user_key === true;
  const provider = normalizeProvider(
    options.provider || resolveProviderFromEngineTier(options.engine_tier)
  );
  if (!userId || !useUserKey || !provider || !ALLOWED_PROVIDERS.has(provider)) {
    return {
      auth_mode: "master_key",
      provider: provider || null,
      provider_api_key: null,
      should_charge_credits: true,
    };
  }
  const userKey = await getUserProviderApiKey(userId, provider);
  if (!userKey || userKey.ok !== true || !userKey.api_key) {
    const reason =
      userKey && userKey.error === "DECRYPTION_FAILED"
        ? "DECRYPTION_FAILED"
        : "user_key_not_found";
    return {
      auth_mode: "master_key",
      provider,
      provider_api_key: null,
      should_charge_credits: true,
      reason,
    };
  }
  return {
    auth_mode: "user_key",
    provider,
    provider_api_key: userKey.api_key,
    should_charge_credits: false,
  };
}

/**
 * @param {string} userId
 * @param {string} provider — openai | anthropic | ...
 * @returns {Promise<boolean>}
 */
async function hasVaultProviderKey(userId, provider) {
  const r = await getUserProviderApiKey(userId, provider);
  return Boolean(r && r.ok === true && String(r.api_key || "").trim().length > 0);
}

module.exports = {
  ALLOWED_PROVIDERS,
  encryptApiKey,
  decryptApiKey,
  listUserApiKeys,
  upsertUserApiKey,
  getUserProviderApiKey,
  hasVaultProviderKey,
  deleteUserApiKey,
  testProviderKey,
  resolveByokRouting,
  resolveProviderFromEngineTier,
  invalidateCachedKey,
};

