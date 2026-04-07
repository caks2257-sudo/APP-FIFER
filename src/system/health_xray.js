const serviceNodes = require("../config/service_nodes.json");

function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/**
 * Valida credenciales .env para conectores multi-tienda (v2.8 Universal Connectors).
 * p.ej. `shopify-api` exige SHOPIFY_API_KEY + SHOPIFY_STORE_URL si FEATURE_SHOPIFY_CONNECTOR=true.
 * @param {object} spec - entrada de service_nodes.extraction_nodes
 */
/**
 * Superficie dedicada: SHOPIFY_API_KEY + SHOPIFY_STORE_URL cuando el conector está activo.
 */
function checkShopifyApiEnvSurface() {
  if (!truthy(process.env.FEATURE_SHOPIFY_CONNECTOR)) {
    return { ok: true, status: "skipped_feature_off", connector: "shopify-api" };
  }
  const missing = [];
  if (!String(process.env.SHOPIFY_API_KEY || "").trim()) {
    missing.push("SHOPIFY_API_KEY");
  }
  if (!String(process.env.SHOPIFY_STORE_URL || "").trim()) {
    missing.push("SHOPIFY_STORE_URL");
  }
  if (missing.length > 0) {
    return {
      ok: false,
      status: "missing_credentials",
      connector: "shopify-api",
      missing,
    };
  }
  return {
    ok: true,
    status: "credentials_present",
    connector: "shopify-api",
  };
}

/**
 * AliExpress affiliate connector — ALIEXPRESS_APP_KEY + APP_SECRET + TRACKING_ID cuando FEATURE_ALIEXPRESS_CONNECTOR=true.
 */
function checkAliExpressApiEnvSurface() {
  if (!truthy(process.env.FEATURE_ALIEXPRESS_CONNECTOR)) {
    return { ok: true, status: "skipped_feature_off", connector: "aliexpress-api" };
  }
  const missing = [];
  if (!String(process.env.ALIEXPRESS_APP_KEY || "").trim()) {
    missing.push("ALIEXPRESS_APP_KEY");
  }
  if (!String(process.env.ALIEXPRESS_APP_SECRET || "").trim()) {
    missing.push("ALIEXPRESS_APP_SECRET");
  }
  if (!String(process.env.ALIEXPRESS_TRACKING_ID || "").trim()) {
    missing.push("ALIEXPRESS_TRACKING_ID");
  }
  if (missing.length > 0) {
    return {
      ok: false,
      status: "missing_credentials",
      connector: "aliexpress-api",
      missing,
    };
  }
  return {
    ok: true,
    status: "credentials_present",
    connector: "aliexpress-api",
  };
}

/**
 * Mercado Libre connector — MERCADOLIBRE_ACCESS_TOKEN cuando FEATURE_MERCADOLIBRE_CONNECTOR=true.
 */
function checkMeliApiEnvSurface() {
  if (!truthy(process.env.FEATURE_MERCADOLIBRE_CONNECTOR)) {
    return { ok: true, status: "skipped_feature_off", connector: "meli-api" };
  }
  const missing = [];
  if (!String(process.env.MERCADOLIBRE_ACCESS_TOKEN || "").trim()) {
    missing.push("MERCADOLIBRE_ACCESS_TOKEN");
  }
  if (missing.length > 0) {
    return {
      ok: false,
      status: "missing_credentials",
      connector: "meli-api",
      missing,
    };
  }
  return {
    ok: true,
    status: "credentials_present",
    connector: "meli-api",
  };
}

/**
 * Amazon PA-API connector — AWS_ACCESS_KEY + AWS_SECRET_KEY + AMAZON_PARTNER_TAG.
 */
function checkAmazonApiEnvSurface() {
  if (!truthy(process.env.FEATURE_AMAZON_CONNECTOR)) {
    return { ok: true, status: "skipped_feature_off", connector: "amazon-api" };
  }
  const missing = [];
  if (!String(process.env.AWS_ACCESS_KEY || process.env.AMAZON_AWS_ACCESS_KEY || "").trim()) {
    missing.push("AWS_ACCESS_KEY");
  }
  if (!String(process.env.AWS_SECRET_KEY || process.env.AMAZON_AWS_SECRET_KEY || "").trim()) {
    missing.push("AWS_SECRET_KEY");
  }
  if (!String(process.env.AMAZON_PARTNER_TAG || "").trim()) {
    missing.push("AMAZON_PARTNER_TAG");
  }
  if (missing.length > 0) {
    return {
      ok: false,
      status: "missing_credentials",
      connector: "amazon-api",
      missing,
    };
  }
  return {
    ok: true,
    status: "credentials_present",
    connector: "amazon-api",
  };
}

/**
 * WooCommerce connector — site + consumer key/secret (supports aliases WC_*).
 */
function checkWooCommerceApiEnvSurface() {
  if (!truthy(process.env.FEATURE_WOOCOMMERCE_CONNECTOR)) {
    return { ok: true, status: "skipped_feature_off", connector: "woocommerce-api" };
  }
  const missing = [];
  if (!String(process.env.WOOCOMMERCE_SITE_URL || process.env.WC_SITE_URL || "").trim()) {
    missing.push("WOOCOMMERCE_SITE_URL");
  }
  if (
    !String(process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY || "").trim()
  ) {
    missing.push("WOOCOMMERCE_CONSUMER_KEY|WC_CONSUMER_KEY");
  }
  if (
    !String(process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET || "").trim()
  ) {
    missing.push("WOOCOMMERCE_CONSUMER_SECRET|WC_CONSUMER_SECRET");
  }
  if (missing.length > 0) {
    return {
      ok: false,
      status: "missing_credentials",
      connector: "woocommerce-api",
      missing,
    };
  }
  return {
    ok: true,
    status: "credentials_present",
    connector: "woocommerce-api",
  };
}

/**
 * Creative premium video surface — requires provider API key(s) when FEATURE_PREMIUM_VIDEO=true.
 */
function checkCreativeVideoApiEnvSurface() {
  if (!truthy(process.env.FEATURE_PREMIUM_VIDEO)) {
    return { ok: true, status: "skipped_feature_off", connector: "creative:video-api" };
  }
  const heygen = String(process.env.HEYGEN_API_KEY || "").trim();
  const pika = String(process.env.PIKA_API_KEY || "").trim();
  const missing = [];
  if (!heygen && !pika) {
    missing.push("one_of:HEYGEN_API_KEY|PIKA_API_KEY");
  }
  if (missing.length > 0) {
    return {
      ok: false,
      status: "missing_credentials",
      connector: "creative:video-api",
      missing,
    };
  }
  return {
    ok: true,
    status: "credentials_present",
    connector: "creative:video-api",
  };
}

function checkExtractionCredentials(spec) {
  const name = spec?.name || "unknown";
  if (spec?.enabled_env && !truthy(process.env[spec.enabled_env])) {
    return {
      ok: true,
      status: "skipped_feature_off",
      connector: name,
    };
  }

  const missing = [];
  for (const key of spec.required_env || []) {
    if (!String(process.env[key] || "").trim()) {
      missing.push(key);
    }
  }

  const groups = spec.any_of_env || [];
  for (const group of groups) {
    if (!Array.isArray(group) || group.length === 0) continue;
    const anySet = group.some((k) => String(process.env[k] || "").trim());
    if (!anySet) {
      missing.push(`one_of:${group.join("|")}`);
    }
  }

  if (missing.length > 0) {
    return {
      ok: false,
      status: "missing_credentials",
      connector: name,
      missing,
    };
  }

  return {
    ok: true,
    status: "credentials_present",
    connector: name,
  };
}

async function pingNode(node) {
  const started = Date.now();
  const timeoutMs = Number(node.timeout_ms || serviceNodes.defaults.timeout_ms || 3500);
  const target = `${node.base_url}${node.routes.heartbeat}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(target, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-FIFER-INTERNAL-KEY": process.env.FIFER_INTERNAL_KEY || "",
      },
      signal: controller.signal,
    });

    return {
      ok: res.ok,
      status: res.status,
      latency_ms: Date.now() - started,
      endpoint: target,
    };
  } catch (err) {
    return {
      ok: false,
      status: "error",
      latency_ms: Date.now() - started,
      endpoint: target,
      detail: err.message || String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runHealthXray(opts = {}) {
  const checks = {};
  const nodes = serviceNodes?.nodes || {};

  /** Master async job store (in-process; v2.4 Nervous System). */
  try {
    const jobStore = require("../api/master/jobs/job_store.js");
    const stats = jobStore.getStats();
    checks.job_store = {
      ok: true,
      status: "ok",
      mode: "memory",
      pending_count: stats.pending,
      total_jobs: stats.total,
    };
  } catch (err) {
    checks.job_store = {
      ok: false,
      status: "error",
      detail: err.message || String(err),
    };
  }

  for (const [key, node] of Object.entries(nodes)) {
    if (node.enabled_env && !truthy(process.env[node.enabled_env])) {
      checks[key] = {
        ok: true,
        status: "skipped_feature_off",
        endpoint: `${node.base_url}${node.routes.heartbeat}`,
      };
      continue;
    }

    checks[key] = await pingNode(node);
  }

  const extraction = serviceNodes.extraction_nodes || {};
  for (const [key, spec] of Object.entries(extraction)) {
    const checkKey = `extract:${key}`;
    checks[checkKey] = checkExtractionCredentials(spec);
  }

  /** v2.8 — chequeo explícito Shopify (mismas reglas que extract:shopify-api; útil para alertas / UI). */
  checks.shopify_api_env = checkShopifyApiEnvSurface();

  /** v3.4 — AliExpress Real-Time API adapter (mismas reglas que extract:aliexpress-api). */
  checks.aliexpress_api_env = checkAliExpressApiEnvSurface();

  /** v3.6 — Mercado Libre API adapter (mismas reglas que extract:meli-api). */
  checks.meli_api_env = checkMeliApiEnvSurface();
  checks.meli_engine_env = checkMeliApiEnvSurface();

  /** v3.6 — Amazon PA-API surface. */
  checks.amazon_api_env = checkAmazonApiEnvSurface();
  checks.amazon_engine_env = checkAmazonApiEnvSurface();

  /** v3.6 — WooCommerce REST surface. */
  checks.woocommerce_api_env = checkWooCommerceApiEnvSurface();
  checks.woo_engine_env = checkWooCommerceApiEnvSurface();

  /** v4.0 — Premium video API surface (HeyGen/Pika). */
  checks["creative:video-api"] = checkCreativeVideoApiEnvSurface();

  const allOk = Object.values(checks).every((v) => v && v.ok);
  const degraded = Object.values(checks).some(
    (v) => v && v.ok && Number(v.latency_ms || 0) > Number(opts.degradedThresholdMs || 2000)
  );

  return {
    at: new Date().toISOString(),
    checks,
    ok: allOk,
    degraded,
    overall: !allOk ? "down" : degraded ? "degraded" : "healthy",
  };
}

module.exports = {
  runHealthXray,
  pingNode,
  truthy,
  checkExtractionCredentials,
  checkShopifyApiEnvSurface,
  checkAliExpressApiEnvSurface,
  checkMeliApiEnvSurface,
  checkAmazonApiEnvSurface,
  checkWooCommerceApiEnvSurface,
  checkCreativeVideoApiEnvSurface,
};
