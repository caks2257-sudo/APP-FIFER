const { VideoApiClient } = require("./video_api_client.js");
const { resolveByokRouting } = require("../auth/byokVault.js");

function normalizeEngineTier(tier) {
  const t = String(tier || "").trim().toLowerCase();
  if (t === "premium" || t === "balanced" || t === "economic") return t;
  return "economic";
}

function extractScriptFromMarketing(marketingPayload) {
  if (!marketingPayload || typeof marketingPayload !== "object") return "";
  if (typeof marketingPayload.caption === "string" && marketingPayload.caption.trim()) {
    return marketingPayload.caption.trim();
  }
  const nestedCampaign = marketingPayload.campaign;
  if (nestedCampaign && typeof nestedCampaign === "object") {
    if (
      typeof nestedCampaign.primary_message === "string" &&
      nestedCampaign.primary_message.trim()
    ) {
      return nestedCampaign.primary_message.trim();
    }
    if (typeof nestedCampaign.hook === "string" && nestedCampaign.hook.trim()) {
      return nestedCampaign.hook.trim();
    }
  }
  return "";
}

/**
 * Adjunta video premium cuando corresponde (tier premium + FEATURE_PREMIUM_VIDEO=true).
 * No rompe payload existente; sólo añade/actualiza `video_url`.
 */
async function maybeAttachPremiumVideo(marketingPayload, options = {}) {
  const engineTier = normalizeEngineTier(options.engine_tier);
  if (engineTier !== "premium") {
    return {
      payload: marketingPayload,
      video_enrichment: "skipped_non_premium",
    };
  }

  const script = extractScriptFromMarketing(marketingPayload);
  if (!script) {
    return {
      payload: marketingPayload,
      video_enrichment: "skipped_no_script",
    };
  }

  const client = new VideoApiClient();
  const video = await client.generateVideo(script, {
    brand: options.brand || null,
    campaign_id: options.campaign_id || null,
  });

  if (!video.ok || !video.video_url) {
    return {
      payload: marketingPayload,
      video_enrichment: "video_generation_failed",
      video_error: video.error || "unknown_video_error",
    };
  }

  return {
    payload: {
      ...(marketingPayload && typeof marketingPayload === "object" ? marketingPayload : {}),
      video_url: video.video_url,
    },
    video_enrichment: "video_attached",
    video_job_id: video.job_id || null,
  };
}

async function resolveMarketingAuthContext(options = {}) {
  const routing = await resolveByokRouting(options);
  if (routing?.reason === "DECRYPTION_FAILED") {
    const err = new Error("DECRYPTION_FAILED");
    err.code = "DECRYPTION_FAILED";
    throw err;
  }
  return routing;
}

module.exports = {
  maybeAttachPremiumVideo,
  extractScriptFromMarketing,
  normalizeEngineTier,
  resolveByokRouting,
  resolveMarketingAuthContext,
};

