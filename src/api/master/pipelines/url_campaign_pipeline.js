/**
 * Intelligent Campaign Manager — pipeline URL → scrape | AliExpress API → Tag-Center → Marketing (v3.4).
 */
const { randomUUID } = require("crypto");
const { scrapeUrlToFifer } = require("../../../modules/affiliates/adapters/web_scraper_adapter.js");
const { AliExpressAdapter } = require("../../../modules/affiliates/adapters/aliexpress_adapter.js");
const { MercadoLibreAdapter } = require("../../../modules/affiliates/adapters/meli_adapter.js");
const { AmazonAdapter } = require("../../../modules/affiliates/adapters/amazon_adapter.js");
const { ShopifyAdapter } = require("../../../modules/affiliates/adapters/shopify_adapter.js");
const { WooCommerceAdapter } = require("../../../modules/affiliates/adapters/woocommerce_adapter.js");
const { successResponse, errorResponse } = require("../../../utils/response_builder.js");
const { executeFullCircle } = require("./sales_content_pipeline.js");
const { createDraft } = require("../../../modules/fifer-platform/campaigns/draftRepository.js");
const { reportCampaignCost } = require("../../../modules/fifer-platform/finance-bridge/finance_client.js");
const {
  buildRawProductDataFromWebScrape,
  enrichTagCenterRequestBody,
} = require("../../../modules/fifer-platform/tag-center/tagRepository.js");

function isAliExpressProductUrl(url) {
  try {
    const u = new URL(String(url).trim());
    return /aliexpress\./i.test(u.hostname);
  } catch {
    return /aliexpress\./i.test(String(url));
  }
}

function isMercadoLibreUrl(url) {
  try {
    const u = new URL(String(url).trim());
    return /mercadolibre\./i.test(u.hostname);
  } catch {
    return /mercadolibre\./i.test(String(url));
  }
}

function isAmazonUrl(url) {
  try {
    const u = new URL(String(url).trim());
    return /(^|\.)amazon\./i.test(u.hostname) || /(^|\.)amzn\.to$/i.test(u.hostname);
  } catch {
    return /amazon\.|amzn\.to/i.test(String(url));
  }
}

function isShopifyUrl(url) {
  try {
    const u = new URL(String(url).trim());
    return /myshopify\.com$/i.test(u.hostname);
  } catch {
    return /myshopify\.com/i.test(String(url));
  }
}

function readKnownWooStores() {
  const out = new Set();
  const envMain = String(process.env.WOOCOMMERCE_SITE_URL || process.env.WC_SITE_URL || "").trim();
  if (envMain) out.add(envMain);
  const listRaw = String(process.env.WOOCOMMERCE_KNOWN_STORES || "").trim();
  if (listRaw) {
    for (const s of listRaw.split(",").map((v) => v.trim()).filter(Boolean)) out.add(s);
  }
  return Array.from(out);
}

function hostFromUrl(input) {
  try {
    return new URL(String(input || "").trim()).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function detectKnownWooStore(url) {
  const host = hostFromUrl(url);
  if (!host) return null;
  const known = readKnownWooStores();
  for (const s of known) {
    const h = hostFromUrl(s);
    if (h && h === host) return s;
  }
  return null;
}

function splitDescriptionToParagraphs(text) {
  const t = String(text || "").trim();
  if (!t) return [];
  const parts = t
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length) return parts.slice(0, 12);
  return [t.slice(0, 8000)];
}

function resolveMinCommissionThreshold() {
  const n = Number(process.env.MIN_COMMISSION_THRESHOLD);
  return Number.isFinite(n) ? n : 3.0;
}

function parseCommissionRate(rate) {
  if (rate == null) return null;
  const raw = String(rate).trim();
  if (!raw) return null;
  const normalized = raw.replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function evaluateProfitabilityGate(rawProductData) {
  const threshold = resolveMinCommissionThreshold();
  const commission = parseCommissionRate(rawProductData?.commission_rate);
  if (commission == null) {
    return { pass: true, commission_rate: null, threshold, reason: "missing_commission_rate" };
  }
  if (commission < threshold) {
    return { pass: false, commission_rate: commission, threshold, reason: "below_threshold" };
  }
  return { pass: true, commission_rate: commission, threshold, reason: "ok" };
}

/**
 * Intenta AliExpress API; si falla, web scrape.
 * @returns {Promise<{ ok: true, d: object, raw_product_data: object, excerpt: string } | { ok: false, ... }>}
 */
async function resolveProductContext(url) {
  const normalizeFromAdapter = (normalized, provider, context_type = "AFFILIATE_STORE") => {
    const paragraphs = splitDescriptionToParagraphs(normalized.description);
    const d = {
      external_id: normalized.external_id,
      name: normalized.name,
      description: normalized.description,
      paragraphs,
      main_image_url: normalized.main_image_url,
      product_url: normalized.product_url,
      provider,
    };
    const raw_product_data = {
      source: provider,
      provider,
      external_id: normalized.external_id,
      product_id: normalized.product_id || normalized.external_id,
      product_url: normalized.product_url,
      price: normalized.price,
      currency: normalized.currency,
      commission_rate: normalized.commission_rate ?? null,
      evaluate_rate:
        normalized.raw_data && typeof normalized.raw_data === "object"
          ? normalized.raw_data.evaluate_rate || null
          : null,
      category: normalized.category || "general",
      rating:
        normalized.raw_data && typeof normalized.raw_data === "object"
          ? normalized.raw_data.rating || null
          : null,
    };
    const excerpt = [d.description, ...paragraphs].filter(Boolean).join("\n\n").slice(0, 12000);
    return { ok: true, d, raw_product_data, excerpt, context_type };
  };

  const knownWooStore = detectKnownWooStore(url);
  if (knownWooStore) {
    try {
      const adapter = new WooCommerceAdapter();
      const normalized = await adapter.getProduct(url, { store_url: knownWooStore, timeoutMs: 9000 });
      if (normalized && normalized.error === "STORE_AUTH_FAILED") {
        return {
          ok: false,
          error: "STORE_AUTH_FAILED",
          code: "STORE_AUTH_FAILED",
          needs_reconnect: true,
        };
      }
      return normalizeFromAdapter(normalized, "woocommerce", "PROPRIETARY_STORE");
    } catch (err) {
      console.warn("[url_campaign_pipeline] WooCommerce detectado pero falló adapter; fallback scrape:", err?.message || err);
    }
  }

  if (isAmazonUrl(url)) {
    try {
      const adapter = new AmazonAdapter();
      const normalized = await adapter.getProduct(url, { timeoutMs: 9000 });
      return normalizeFromAdapter(normalized, "amazon", "AFFILIATE_STORE");
    } catch (err) {
      console.warn("[url_campaign_pipeline] Amazon adapter falló; fallback scrape:", err?.message || err);
    }
  }

  if (isMercadoLibreUrl(url)) {
    try {
      const adapter = new MercadoLibreAdapter();
      const normalized = await adapter.getProduct(url, { timeoutMs: 9000 });
      return normalizeFromAdapter(normalized, "mercadolibre", "AFFILIATE_STORE");
    } catch (err) {
      console.warn("[url_campaign_pipeline] Mercado Libre adapter falló; fallback scrape:", err?.message || err);
    }
  }

  if (isAliExpressProductUrl(url)) {
    try {
      const adapter = new AliExpressAdapter();
      const normalized = await adapter.getProduct(url);
      return normalizeFromAdapter(
        { ...normalized, ...{ commission_rate: normalized.commission_rate } },
        "aliexpress",
        "AFFILIATE_STORE"
      );
    } catch (err) {
      console.warn(
        "[url_campaign_pipeline] AliExpress API no disponible o error; fallback web scrape:",
        err?.message || err
      );
    }
  }

  if (isShopifyUrl(url)) {
    try {
      const adapter = new ShopifyAdapter();
      const normalized = await adapter.getProduct(url, { timeoutMs: 9000 });
      return normalizeFromAdapter(normalized, "shopify", "AFFILIATE_STORE");
    } catch (err) {
      console.warn("[url_campaign_pipeline] Shopify adapter falló; fallback scrape:", err?.message || err);
    }
  }

  const scrape = await scrapeUrlToFifer(url);
  if (!scrape.ok) {
    return scrape;
  }
  const d = scrape.data;
  const raw_product_data = buildRawProductDataFromWebScrape(d);
  const excerpt = [d.description, ...(d.paragraphs || [])].filter(Boolean).join("\n\n").slice(0, 12000);
  return { ok: true, d, raw_product_data, excerpt, context_type: "WEB_GENERIC" };
}

/**
 * @param {{ url: string, user_id?: string }} input
 */
async function runUrlCampaignPipeline(input = {}) {
  const url = String(input.url || "").trim();
  if (!url) {
    return errorResponse("url es obligatoria", { node: "url_campaign_pipeline", code: "missing_url" });
  }

  const resolved = await resolveProductContext(url);
  if (!resolved.ok) {
    return errorResponse(resolved.error || "scrape_failed", {
      node: "url_campaign_pipeline",
      code: resolved.code || "scrape_error",
    });
  }

  const { d, raw_product_data, excerpt } = resolved;

  const gate = evaluateProfitabilityGate(raw_product_data);
  if (!gate.pass) {
    return errorResponse(
      `Producto descartado: comisión ${gate.commission_rate}% por debajo del mínimo ${gate.threshold}%`,
      {
        node: "url_campaign_pipeline",
        code: "LOW_PROFITABILITY_ERROR",
        commission_rate: gate.commission_rate,
        min_commission_threshold: gate.threshold,
      },
      {
        discarded: true,
        discard_reason: "low_profitability",
        raw_product_data,
      }
    );
  }

  const tagCenterBase = {
    source: "url_ingestion",
    url: d.product_url,
    title: d.name,
    excerpt,
    paragraphs: d.paragraphs,
    image_url: d.main_image_url,
    context_type: resolved.context_type || "WEB_GENERIC",
  };

  const marketingBase = {
    source: "url_ingestion",
    url: d.product_url,
    title: d.name,
    excerpt,
    image_url: d.main_image_url,
    format_type: "campaign",
    context_type: resolved.context_type || "WEB_GENERIC",
    native_metrics: raw_product_data
      ? {
          price: raw_product_data.price,
          currency: raw_product_data.currency,
          commission_rate: raw_product_data.commission_rate,
          evaluate_rate: raw_product_data.evaluate_rate,
          category: raw_product_data.category,
          rating: raw_product_data.rating,
          source: raw_product_data.source,
        }
      : undefined,
  };

  const pipelineOptions = {
    skipMakeWebhook: true,
    skip_finance_report: true,
    simulateAsyncMarketing: false,
    raw_product_data,
    requested_engine_tier:
      typeof input.requested_engine_tier === "string" ? input.requested_engine_tier : null,
    use_user_key: input.use_user_key === true,
    user_id: input.user_id || null,
    pipeline_job_id: `url-campaign-${randomUUID()}`,
    product_id: d.external_id,
    product_name: d.name,
    product_url: d.product_url,
    product: {
      id: d.external_id,
      name: d.name,
      url: d.product_url,
    },
    campaign_context: excerpt,
    tagCenter: {
      method: "POST",
      body: enrichTagCenterRequestBody(tagCenterBase, { raw_product_data }),
    },
    marketing: {
      method: "POST",
      body: marketingBase,
    },
  };

  const result = await executeFullCircle(pipelineOptions);

  if (!result.success) {
    return result;
  }

  const base =
    result.data && typeof result.data === "object" ? { ...result.data } : {};
  const marketing = base.marketing;
  const pendingMarketing =
    marketing &&
    typeof marketing === "object" &&
    marketing.pending === true;
  const campaign_content =
    !pendingMarketing && marketing != null ? marketing : null;
  const strategy =
    base.strategyContext != null
      ? base.strategyContext
      : base.tag_center?.strategyContext != null
        ? base.tag_center.strategyContext
        : null;

  const enrichedData = {
    ...base,
    strategy,
    campaign_content,
    raw_product_data,
    url_ingestion: {
      url: d.product_url,
      scraped_title: d.name,
      main_image_url: d.main_image_url,
      paragraphs_preview: (d.paragraphs || []).slice(0, 3),
    },
  };

  const pipelineMeta = result.metadata && typeof result.metadata === "object" ? result.metadata : {};
  let draftRes = { ok: false, draft_id: null, error: null };
  try {
    draftRes = await createDraft({
      user_id: input.user_id,
      source_url: d.product_url,
      strategy_data: strategy ?? {},
      content_data: campaign_content ?? {},
      metadata: {
        cost_est: pipelineMeta.cost_est,
        node: pipelineMeta.node,
        latency_ms: pipelineMeta.latency_ms,
        pipeline_job_id: pipelineOptions.pipeline_job_id,
        dry_run: Boolean(base.dry_run),
        raw_product_snapshot: raw_product_data
          ? {
              source: raw_product_data.source,
              price: raw_product_data.price,
              commission_rate: raw_product_data.commission_rate,
            }
          : undefined,
      },
    });
  } catch (err) {
    draftRes = {
      ok: false,
      draft_id: null,
      error: err?.message || String(err),
    };
  }

  const dataWithDraft = {
    ...enrichedData,
    draft_id: draftRes.ok && draftRes.draft_id ? draftRes.draft_id : null,
  };

  try {
    await reportCampaignCost(
      input.user_id || null,
      dataWithDraft.draft_id || null,
      Number(pipelineMeta.cost_est || 0)
    );
  } catch (err) {
    console.warn("[url_campaign_pipeline] finance report failed:", err?.message || String(err));
  }

  return {
    ...result,
    data: dataWithDraft,
    metadata: {
      ...pipelineMeta,
      draft_persisted: draftRes.ok,
      ...(draftRes.ok && draftRes.draft_id ? { draft_id: draftRes.draft_id } : {}),
      ...(!draftRes.ok && draftRes.error ? { draft_persist_error: draftRes.error } : {}),
    },
  };
}

module.exports = {
  runUrlCampaignPipeline,
};
