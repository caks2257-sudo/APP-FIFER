const axios = require("axios");

const DEFAULT_DISPATCH_TIMEOUT_MS = 30000;
const INVENTORY_EVENTS = new Set([
  "CAMPAIGN_PAUSED_NO_STOCK",
  "RESUME_CAMPAIGN_STOCK_RESTORED",
]);

const formatMakePayload = (product, strategy, content, metadata) => {
  const dryRunEnv = process.env.FEATURE_DRY_RUN === "true";
  const dry = dryRunEnv || Boolean(metadata && metadata.is_simulation);
  return {
    fifer_metadata: {
      environment: process.env.NODE_ENV || "development",
      job_id: metadata.job_id || "manual_trigger",
      timestamp: new Date().toISOString(),
      ...(dry ? { is_simulation: true } : {}),
    },
    product: { id: product.id || "unknown", name: product.name || "No Name", url: product.url || "" },
    strategy: {
      score: strategy.score || 0,
      primary_niche: strategy.primary_niche || "general",
      price_tier: strategy.price_tier || "standard",
      tags: strategy.tags || [],
    },
    campaign_content: {
      format_type: content.format_type || "post",
      platforms: content.platforms || ["instagram"],
      assets: {
        video_url: content.video_url || "",
        caption: content.caption || "",
        voice_id: content.voice_id || "",
      },
    },
  };
};

/**
 * Maps a persisted campaign_drafts row to the shape expected by dispatchMakeWebhook (Doctrina de Acción por Referencia).
 * @param {object} draft Row from fifer_platform.campaign_drafts
 */
function buildMakeDispatchPayloadFromDraft(draft) {
  const strategyData = draft.strategy_data && typeof draft.strategy_data === "object" ? draft.strategy_data : {};
  const contentData = draft.content_data && typeof draft.content_data === "object" ? draft.content_data : {};
  const meta = draft.metadata && typeof draft.metadata === "object" ? draft.metadata : {};

  const tags = Array.isArray(strategyData.tags) ? strategyData.tags.map((t) => String(t)) : [];
  const campaignNested =
    contentData.campaign && typeof contentData.campaign === "object" ? contentData.campaign : null;
  const captionFromNested =
    campaignNested && typeof campaignNested.primary_message === "string"
      ? campaignNested.primary_message
      : typeof campaignNested?.hook === "string"
        ? campaignNested.hook
        : "";

  const productName =
    (typeof meta.scraped_title === "string" && meta.scraped_title) ||
    (typeof meta.url_ingestion?.scraped_title === "string" && meta.url_ingestion.scraped_title) ||
    strategyData.primary_niche ||
    draft.source_url ||
    "Campaign";

  return {
    product: {
      id: draft.id,
      name: String(productName).slice(0, 200),
      url: String(draft.source_url || ""),
    },
    strategy: {
      score: Number(strategyData.score) || 0,
      primary_niche: strategyData.primary_niche || strategyData.routing || "general",
      price_tier: strategyData.price_tier || "standard",
      tags,
    },
    content: {
      format_type: contentData.format_type || "post",
      platforms: Array.isArray(contentData.platforms) ? contentData.platforms : ["instagram"],
      video_url: typeof contentData.video_url === "string" ? contentData.video_url : "",
      caption:
        typeof contentData.caption === "string" && contentData.caption.trim()
          ? contentData.caption
          : captionFromNested || "",
      voice_id: typeof contentData.voice_id === "string" ? contentData.voice_id : "",
    },
    metadata: {
      job_id: draft.id,
      draft_id: draft.id,
      is_simulation: process.env.FEATURE_DRY_RUN === "true",
    },
  };
}

/**
 * @param {object} data { product, strategy, content, metadata } — mismo contrato que sales_content_pipeline
 * @param {{ force?: boolean, timeoutMs?: number }} options force=true omite FEATURE_AUTO_PUBLISH (publicación explícita desde borrador)
 */
async function dispatchMakeWebhook(data, options = {}) {
  const force = options.force === true;
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    return { success: false, reason: "missing_webhook_url" };
  }
  if (!force && process.env.FEATURE_AUTO_PUBLISH !== "true") {
    return { success: false, reason: "disabled" };
  }

  const timeoutMs =
    Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
      ? Number(options.timeoutMs)
      : DEFAULT_DISPATCH_TIMEOUT_MS;

  try {
    const payload = formatMakePayload(data.product, data.strategy, data.content, data.metadata);
    const response = await axios.post(webhookUrl, payload, {
      timeout: timeoutMs,
      validateStatus: () => true,
    });
    const ok = response.status >= 200 && response.status < 300;
    if (!ok) {
      return {
        success: false,
        reason: "http_error",
        status: response.status,
        body: response.data,
      };
    }
    return {
      success: true,
      job_id: payload.fifer_metadata.job_id,
      http_status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || String(error),
      reason: "request_failed",
    };
  }
}

/**
 * Notifica a Make para pausar una campaña por inventario agotado.
 * Webhook payload mínimo orientado a evento.
 * @param {string} draftId
 * @param {{ reason?: string, source_store?: string, product_id?: string, platform_ad_id?: string|null }} [options]
 */
async function notifyMakeToPause(draftId, options = {}) {
  const id = String(draftId || "").trim();
  if (!id) {
    return { success: false, reason: "missing_draft_id" };
  }
  const webhookUrl = String(process.env.MAKE_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    return { success: false, reason: "missing_webhook_url" };
  }

  const timeoutMs = Number(process.env.MAKE_PAUSE_TIMEOUT_MS || DEFAULT_DISPATCH_TIMEOUT_MS);
  const payload = {
    event: "CAMPAIGN_PAUSED_NO_STOCK",
    draft_id: id,
    reason: String(options.reason || "out_of_stock"),
    source_store: options.source_store || null,
    product_id: options.product_id || null,
    platform_ad_id: options.platform_ad_id || null,
    fifer_metadata: {
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      actor: "inventory_guardian",
    },
  };

  try {
    const response = await axios.post(webhookUrl, payload, {
      timeout: timeoutMs,
      validateStatus: () => true,
    });
    if (response.status < 200 || response.status >= 300) {
      return {
        success: false,
        reason: "http_error",
        status: response.status,
        body: response.data,
      };
    }
    return { success: true, status: response.status };
  } catch (error) {
    return {
      success: false,
      reason: "request_failed",
      error: error?.message || String(error),
    };
  }
}

/**
 * Notifica a Make para reanudar una campaña cuando se restaura stock.
 * Solo se considera éxito con acuse 2xx; de lo contrario, el monitor reintenta luego.
 * @param {string} draftId
 * @param {{ source_store?: string, product_id?: string }} [options]
 */
async function notifyMakeToResume(draftId, options = {}) {
  const id = String(draftId || "").trim();
  if (!id) {
    return { success: false, reason: "missing_draft_id" };
  }
  const webhookUrl = String(process.env.MAKE_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    return { success: false, reason: "missing_webhook_url" };
  }

  const timeoutMs = Number(process.env.MAKE_RESUME_TIMEOUT_MS || DEFAULT_DISPATCH_TIMEOUT_MS);
  const payload = {
    event: "RESUME_CAMPAIGN_STOCK_RESTORED",
    draft_id: id,
    source_store: options.source_store || null,
    product_id: options.product_id || null,
    fifer_metadata: {
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      actor: "inventory_guardian",
    },
  };

  try {
    const response = await axios.post(webhookUrl, payload, {
      timeout: timeoutMs,
      validateStatus: () => true,
    });
    if (response.status < 200 || response.status >= 300) {
      return {
        success: false,
        reason: "http_error",
        status: response.status,
        body: response.data,
      };
    }
    return { success: true, status: response.status };
  } catch (error) {
    return {
      success: false,
      reason: "request_failed",
      error: error?.message || String(error),
    };
  }
}

function resolveInventoryWebhookUrl() {
  const dedicated = String(process.env.MAKE_INVENTORY_WEBHOOK_URL || "").trim();
  if (dedicated) return dedicated;
  return String(process.env.MAKE_WEBHOOK_URL || "").trim();
}

/**
 * Dispatcher unificado para cambios de inventario.
 * Requisito estricto: SOLO true cuando Make responde HTTP 200 exacto.
 * @param {object} draft
 * @param {"CAMPAIGN_PAUSED_NO_STOCK" | "RESUME_CAMPAIGN_STOCK_RESTORED"} eventType
 * @returns {Promise<boolean>}
 */
async function notifyMakeInventoryChange(draft, eventType) {
  const evt = String(eventType || "").trim();
  if (!INVENTORY_EVENTS.has(evt)) return false;
  const draftId = String(draft?.id || "").trim();
  if (!draftId) return false;

  const webhookUrl = resolveInventoryWebhookUrl();
  if (!webhookUrl) return false;

  const meta = draft?.metadata && typeof draft.metadata === "object" ? draft.metadata : {};
  const raw = meta.raw_product_snapshot && typeof meta.raw_product_snapshot === "object"
    ? meta.raw_product_snapshot
    : {};

  const productId = String(
    raw.external_id || raw.product_id || raw.item_id || raw.id || draft?.source_url || ""
  ).trim();
  const store = String(raw.source_store || raw.provider || meta.source_store || "").trim().toLowerCase();
  const platformAdId = String(meta.platform_ad_id || "").trim() || null;

  const payload = {
    event_type: evt,
    draft_id: draftId,
    product_id: productId || null,
    store: store || null,
    platform_ad_id: platformAdId,
    fifer_metadata: {
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      actor: "inventory_guardian",
    },
  };

  console.log(`📡 Enviando orden de ${evt} a Make para Draft ${draftId}`);

  try {
    const response = await axios.post(webhookUrl, payload, {
      timeout: Number(process.env.MAKE_INVENTORY_TIMEOUT_MS || DEFAULT_DISPATCH_TIMEOUT_MS),
      validateStatus: () => true,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

module.exports = {
  dispatchMakeWebhook,
  notifyMakeToPause,
  notifyMakeToResume,
  notifyMakeInventoryChange,
  buildMakeDispatchPayloadFromDraft,
  formatMakePayload,
};
