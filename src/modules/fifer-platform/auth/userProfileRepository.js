/**
 * Perfil de usuario en `fifer_auth.user_profile` (tier de suscripción).
 */
const { createClient } = require("@supabase/supabase-js");

const AUTH_SCHEMA = "fifer_auth";
let _client = null;

function getAuthSchemaClient() {
  if (_client) return _client;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: AUTH_SCHEMA },
  });
  return _client;
}

/**
 * @returns {Promise<{ tier: 'free'|'pro', tier_expires_at: string | null, expired_pro: boolean }>}
 */
async function getUserSubscriptionProfile(userId) {
  const uid = String(userId || "").trim();
  if (!uid) {
    return { tier: "free", tier_expires_at: null, expired_pro: false };
  }
  const supabase = getAuthSchemaClient();
  if (!supabase) {
    return { tier: "free", tier_expires_at: null, expired_pro: false };
  }
  const { data, error } = await supabase
    .from("user_profile")
    .select("subscription_tier, tier_expires_at")
    .eq("user_id", uid)
    .maybeSingle();

  if (error || !data) {
    return { tier: "free", tier_expires_at: null, expired_pro: false };
  }

  const rawTier = String(data.subscription_tier || "free").toLowerCase() === "pro" ? "pro" : "free";
  const expIso = data.tier_expires_at ? String(data.tier_expires_at) : null;
  const exp = expIso ? new Date(expIso) : null;
  const expiredPro = rawTier === "pro" && exp != null && !Number.isNaN(exp.getTime()) && exp.getTime() < Date.now();

  if (expiredPro) {
    return { tier: "free", tier_expires_at: expIso, expired_pro: true };
  }
  return {
    tier: rawTier,
    tier_expires_at: expIso,
    expired_pro: false,
  };
}

module.exports = {
  getUserSubscriptionProfile,
  getAuthSchemaClient,
};
