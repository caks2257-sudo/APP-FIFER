/**
 * Persistent Workspace — campaign drafts (fifer_platform.campaign_drafts).
 * Inserts use Supabase service role from the API process (bypasses RLS).
 */
const { createClient } = require("@supabase/supabase-js");

const SCHEMA = "fifer_platform";
const TABLE = "campaign_drafts";
const AD_MAPPING_TABLE = "ad_mappings";

let _serviceClient = null;

function getServiceClient() {
  if (_serviceClient) return _serviceClient;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  _serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serviceClient;
}

/**
 * Resolves user id: real JWT user in production; optional dev fallback UUID.
 * @param {string|null|undefined} userId
 * @returns {string|null}
 */
function resolveUserId(userId) {
  const explicit = userId != null ? String(userId).trim() : "";
  if (explicit) return explicit;

  const isProd = process.env.NODE_ENV === "production";
  const fallback = String(process.env.FIFER_CAMPAIGN_DRAFT_FALLBACK_USER_ID || "").trim();
  if (!isProd && fallback) return fallback;

  return null;
}

/**
 * @param {{
 *   user_id?: string|null,
 *   source_url: string,
 *   strategy_data?: object,
 *   content_data?: object,
 *   metadata?: object,
 * }} draftData
 * @returns {Promise<{ ok: boolean, draft_id: string|null, error: string|null, skipped?: boolean }>}
 */
async function createDraft(draftData) {
  const userId = resolveUserId(draftData.user_id);
  if (!userId) {
    return {
      ok: false,
      draft_id: null,
      error: "missing_user_id",
      skipped: true,
    };
  }

  const client = getServiceClient();
  if (!client) {
    return {
      ok: false,
      draft_id: null,
      error: "supabase_service_not_configured",
      skipped: true,
    };
  }

  const sourceUrl = String(draftData.source_url || "").trim();
  if (!sourceUrl) {
    return { ok: false, draft_id: null, error: "missing_source_url", skipped: true };
  }

  const strategyData =
    draftData.strategy_data && typeof draftData.strategy_data === "object"
      ? draftData.strategy_data
      : {};
  const contentData =
    draftData.content_data && typeof draftData.content_data === "object"
      ? draftData.content_data
      : {};
  const extraMeta = draftData.metadata && typeof draftData.metadata === "object" ? draftData.metadata : {};
  const platformAdId = String(
    draftData.platform_ad_id != null ? draftData.platform_ad_id : extraMeta.platform_ad_id || ""
  ).trim();

  const row = {
    user_id: userId,
    source_url: sourceUrl,
    status: "draft",
    strategy_data: strategyData,
    content_data: contentData,
    metadata: {
      ...extraMeta,
      ...(platformAdId ? { platform_ad_id: platformAdId } : {}),
      environment: process.env.NODE_ENV || "development",
    },
  };

  const { data, error } = await client.schema(SCHEMA).from(TABLE).insert(row).select("id").single();

  if (error) {
    return { ok: false, draft_id: null, error: error.message || String(error) };
  }

  return { ok: true, draft_id: data.id, error: null };
}

/**
 * Guarda/actualiza platform_ad_id en metadata del draft.
 * @param {string} draftId
 * @param {string} platformAdId
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function setDraftPlatformAdId(draftId, platformAdId) {
  const id = String(draftId || "").trim();
  const adId = String(platformAdId || "").trim();
  if (!id) return { ok: false, error: "missing_draft_id" };
  if (!adId) return { ok: false, error: "missing_platform_ad_id" };
  const client = getServiceClient();
  if (!client) return { ok: false, error: "supabase_not_configured" };

  const existing = await getDraftById(id);
  if (!existing) return { ok: false, error: "draft_not_found" };
  const currentMeta =
    existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
  const nextMeta = { ...currentMeta, platform_ad_id: adId };

  const { error } = await client
    .schema(SCHEMA)
    .from(TABLE)
    .update({ metadata: nextMeta })
    .eq("id", id);
  if (error) return { ok: false, error: error.message || String(error) };
  return { ok: true };
}

/**
 * Inserta/actualiza mapping de anuncio externo por platform_ad_id (ON CONFLICT DO UPDATE).
 * Requiere índice único sobre platform_ad_id.
 * @param {{ draft_id: string, platform_name: string, platform_ad_id: string, status?: string }} input
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
async function upsertAdMapping(input) {
  const draftId = String(input?.draft_id || "").trim();
  const platformName = String(input?.platform_name || "").trim().toLowerCase();
  const platformAdId = String(input?.platform_ad_id || "").trim();
  const status = String(input?.status || "active").trim().toLowerCase();
  if (!draftId) return { ok: false, error: "missing_draft_id" };
  if (!platformName) return { ok: false, error: "missing_platform_name" };
  if (!platformAdId) return { ok: false, error: "missing_platform_ad_id" };

  const client = getServiceClient();
  if (!client) return { ok: false, error: "supabase_not_configured" };

  const row = {
    draft_id: draftId,
    platform_name: platformName,
    platform_ad_id: platformAdId,
    status,
  };

  const { data, error } = await client
    .schema(SCHEMA)
    .from(AD_MAPPING_TABLE)
    .upsert(row, { onConflict: "platform_ad_id" })
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message || String(error) };
  return { ok: true, data: data || row };
}

/**
 * Obtiene mapping por draft_id (último creado).
 * @param {string} draftId
 * @returns {Promise<object|null>}
 */
async function getAdMappingByDraftId(draftId) {
  const id = String(draftId || "").trim();
  if (!id) return null;
  const client = getServiceClient();
  if (!client) return null;
  const { data, error } = await client
    .schema(SCHEMA)
    .from(AD_MAPPING_TABLE)
    .select("*")
    .eq("draft_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * @param {string} draftId
 * @returns {Promise<object|null>}
 */
async function getDraftById(draftId) {
  const id = String(draftId || "").trim();
  if (!id) return null;
  const client = getServiceClient();
  if (!client) return null;
  const { data, error } = await client
    .schema(SCHEMA)
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Borrador solo si el par id + usuario coincide (un solo round-trip).
 * @param {string} draftId
 * @param {string|null|undefined} userId
 * @returns {Promise<object|null>}
 */
async function getDraftByIdAndUser(draftId, userId) {
  const id = String(draftId || "").trim();
  const uid = userId != null ? String(userId).trim() : "";
  if (!id || !uid) return null;
  const client = getServiceClient();
  if (!client) return null;
  const { data, error } = await client
    .schema(SCHEMA)
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .eq("user_id", uid)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

const ALLOWED_DRAFT_STATUS = new Set(["draft", "published", "discarded", "paused_by_inventory"]);

/**
 * @param {string} draftId
 * @param {string} status
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function markDraftAsStatus(draftId, status) {
  const id = String(draftId || "").trim();
  const st = String(status || "").trim();
  if (!id) return { ok: false, error: "missing_draft_id" };
  if (!ALLOWED_DRAFT_STATUS.has(st)) return { ok: false, error: "invalid_status" };
  const client = getServiceClient();
  if (!client) return { ok: false, error: "supabase_not_configured" };
  const { error } = await client.schema(SCHEMA).from(TABLE).update({ status: st }).eq("id", id);
  if (error) return { ok: false, error: error.message || String(error) };
  return { ok: true };
}

module.exports = {
  createDraft,
  getDraftById,
  getDraftByIdAndUser,
  markDraftAsStatus,
  setDraftPlatformAdId,
  upsertAdMapping,
  getAdMappingByDraftId,
  resolveUserId,
  getServiceClient,
};
