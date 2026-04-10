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

const ALLOWED_DRAFT_STATUS = new Set([
  "draft",
  "published",
  "discarded",
  "paused_by_inventory",
  "processing_external",
  "failed_dispatch",
]);

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resuelve fila de ai_capabilities a partir del borrador (voice_id UUID o external_id ElevenLabs).
 * @param {object} draft
 * @returns {Promise<object|null>}
 */
async function findAiCapabilityForDraftVoice(draft) {
  const content = draft?.content_data && typeof draft.content_data === "object" ? draft.content_data : {};
  const ref =
    (typeof content.voice_id === "string" && content.voice_id.trim()) ||
    (typeof content.voice_external_id === "string" && content.voice_external_id.trim()) ||
    "";
  if (!ref) return null;

  const client = getServiceClient();
  if (!client) return null;

  if (UUID_RE.test(ref)) {
    const { data, error } = await client
      .schema(SCHEMA)
      .from("ai_capabilities")
      .select("*")
      .eq("id", ref)
      .maybeSingle();
    if (!error && data) return data;
  }

  const { data, error } = await client
    .schema(SCHEMA)
    .from("ai_capabilities")
    .select("*")
    .eq("provider", "elevenlabs")
    .eq("capability_type", "voice")
    .eq("external_id", ref)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

const PUBLISH_LOG = "master_pipeline_publish_log";

/**
 * Borradores del usuario (Command Center / historial).
 * @param {string} userId
 * @param {number} [limit]
 * @returns {Promise<{ ok: boolean, rows?: object[], error?: string }>}
 */
async function listDraftsForUser(userId, limit = 50) {
  const uid = String(userId || "").trim();
  if (!uid) return { ok: false, error: "missing_user_id", rows: [] };
  const client = getServiceClient();
  if (!client) return { ok: false, error: "supabase_not_configured", rows: [] };
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const { data, error } = await client
    .schema(SCHEMA)
    .from(TABLE)
    .select("id, status, source_url, published_url, published_at, metadata, created_at, updated_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(lim);

  if (error) return { ok: false, error: error.message || String(error), rows: [] };
  return { ok: true, rows: data || [] };
}

/**
 * Cierre de ciclo: Make.com notifica URL final → published + log EXTERNAL_PUBLISH_SUCCESS.
 * @param {string} draftId
 * @param {{ published_url: string, platform?: string|null }} input
 * @returns {Promise<{ ok: boolean, error?: string, status?: string, details?: string }>}
 */
async function finalizeDraftExternalPublish(draftId, input) {
  const id = String(draftId || "").trim();
  const url = String(input?.published_url || "").trim();
  const platform = input?.platform != null ? String(input.platform).trim() : "";

  if (!id) return { ok: false, error: "missing_draft_id" };
  if (!url) return { ok: false, error: "missing_published_url" };
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: "invalid_published_url" };

  const client = getServiceClient();
  if (!client) return { ok: false, error: "supabase_not_configured" };

  const draft = await getDraftById(id);
  if (!draft) return { ok: false, error: "not_found" };

  const okStates = new Set(["processing_external", "published"]);
  if (!okStates.has(draft.status)) {
    return { ok: false, error: "invalid_draft_state", status: draft.status };
  }

  const meta = draft.metadata && typeof draft.metadata === "object" ? { ...draft.metadata } : {};
  if (platform) meta.publish_callback_platform = platform;
  meta.external_publish_completed_at = new Date().toISOString();

  const publishedAt = new Date().toISOString();

  const { error: uErr } = await client
    .schema(SCHEMA)
    .from(TABLE)
    .update({
      status: "published",
      published_url: url,
      published_at: publishedAt,
      metadata: meta,
    })
    .eq("id", id);

  if (uErr) return { ok: false, error: uErr.message || String(uErr) };

  const { error: lErr } = await client.schema(SCHEMA).from(PUBLISH_LOG).insert({
    job_id: id,
    publish_status: "EXTERNAL_PUBLISH_SUCCESS",
    error: null,
    payload: {
      draft_id: id,
      published_url: url,
      platform: platform || null,
      completed_at: publishedAt,
    },
  });

  if (lErr) {
    console.error("[finalizeDraftExternalPublish] master_pipeline_publish_log:", lErr.message || lErr);
    return { ok: false, error: "log_insert_failed", details: lErr.message || String(lErr) };
  }

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
  findAiCapabilityForDraftVoice,
  listDraftsForUser,
  finalizeDraftExternalPublish,
  resolveUserId,
  getServiceClient,
};
