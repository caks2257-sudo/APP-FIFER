#!/usr/bin/env node
/**
 * Affiliate Power-Grid v3.6 — Mass Extraction Verifier
 *
 * Objetivo:
 * - Extraer hasta 50 productos por plataforma (AliExpress, Mercado Libre, Amazon, Shopify, WooCommerce)
 * - Normalizar mediante adaptadores existentes
 * - Validar esquema FiferNormalizedProduct
 * - Reportar resumen + guardar data cruda en logs/mass_extraction_report.json
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");

const REPO_ROOT = path.join(__dirname, "..", "..");
const ENV_MAIN = path.join(REPO_ROOT, ".env");
const ENV_LOCAL = path.join(REPO_ROOT, ".env.local");

require("dotenv").config({ path: ENV_MAIN });
if (fs.existsSync(ENV_LOCAL)) {
  require("dotenv").config({ path: ENV_LOCAL, override: true });
}

const { AliExpressAdapter, extractItemIdFromAliExpressUrl } = require(path.join(
  __dirname,
  "../modules/affiliates/adapters/aliexpress_adapter.js"
));
const { MercadoLibreAdapter } = require(path.join(
  __dirname,
  "../modules/affiliates/adapters/meli_adapter.js"
));
const { AmazonAdapter } = require(path.join(
  __dirname,
  "../modules/affiliates/adapters/amazon_adapter.js"
));
const {
  ShopifyAdapter,
  resolveStoreHost,
  resolveAccessToken,
} = require(path.join(__dirname, "../modules/affiliates/adapters/shopify_adapter.js"));
const {
  WooCommerceAdapter,
  resolveCredentialsDynamic,
} = require(path.join(__dirname, "../modules/affiliates/adapters/woocommerce_adapter.js"));

const LIMIT_PER_PLATFORM = 50;
const SLEEP_MS = 500;
const LOGS_DIR = path.join(REPO_ROOT, "logs");
const REPORT_PATH = path.join(LOGS_DIR, "mass_extraction_report.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toFiferShape(product, fallbackSource) {
  const p = product && typeof product === "object" ? product : {};
  return {
    external_id: p.external_id != null ? String(p.external_id) : "",
    name: p.name != null ? String(p.name) : "",
    price: safeNumber(p.price),
    currency: p.currency != null ? String(p.currency) : "",
    main_image_url: p.main_image_url != null ? String(p.main_image_url) : "",
    source_store: p.source_store != null ? String(p.source_store) : fallbackSource,
    commission_rate: p.commission_rate != null ? String(p.commission_rate) : null,
    stock_status: p.stock_status != null ? String(p.stock_status) : "unknown",
    raw_data: p.raw_data != null ? p.raw_data : p.raw != null ? p.raw : null,
    _raw_original: p,
  };
}

function validateFiferProduct(product) {
  const missing = [];
  if (!product.external_id) missing.push("external_id");
  if (!product.name) missing.push("name");
  if (product.price == null || !Number.isFinite(product.price) || product.price <= 0) {
    missing.push("price");
  }
  if (!product.currency) missing.push("currency");
  if (!product.main_image_url) missing.push("main_image_url");
  if (!product.source_store) missing.push("source_store");
  if (!product.stock_status) missing.push("stock_status");
  if (product.raw_data == null) missing.push("raw_data");
  if (product.commission_rate == null || String(product.commission_rate).trim() === "") {
    missing.push("commission_rate");
  }
  if (missing.length > 0) {
    return { ok: false, code: "INVALID_DATA", missing };
  }
  return { ok: true, code: "OK", missing: [] };
}

function printHeader(title) {
  const line = "=".repeat(Math.max(24, title.length + 6));
  console.log(`\n${line}\n${title}\n${line}`);
}

function aliTimestamp() {
  const d = new Date();
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = f.formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function generateAliSign(params, appSecret) {
  const keys = Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== undefined && params[k] !== null)
    .sort();
  const payload = keys.map((k) => `${k}${String(params[k])}`).join("");
  return crypto
    .createHash("md5")
    .update(`${appSecret}${payload}${appSecret}`, "utf8")
    .digest("hex")
    .toUpperCase();
}

async function getAliTopIds(limit) {
  const appKey = String(process.env.ALIEXPRESS_APP_KEY || "").trim();
  const appSecret = String(process.env.ALIEXPRESS_APP_SECRET || "").trim();
  const apiUrl = String(process.env.ALIEXPRESS_API_URL || "https://api-sg.aliexpress.com/rest").trim();
  if (!appKey || !appSecret) {
    throw new Error("faltan ALIEXPRESS_APP_KEY/ALIEXPRESS_APP_SECRET");
  }
  const params = {
    method: "aliexpress.affiliate.hotproduct.query",
    app_key: appKey,
    timestamp: aliTimestamp(),
    sign_method: "md5",
    format: "json",
    v: "2.0",
    page_no: "1",
    page_size: String(limit),
    target_currency: "USD",
    target_language: "EN",
  };
  const accessToken = String(process.env.ALIEXPRESS_ACCESS_TOKEN || "").trim();
  if (accessToken) params.access_token = accessToken;
  params.sign = generateAliSign(params, appSecret);

  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    body.append(k, String(v));
  }
  const res = await axios.post(apiUrl, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    timeout: 15000,
    validateStatus: () => true,
  });
  if (res.status >= 400) {
    throw new Error(`AliExpress hotproduct HTTP ${res.status}`);
  }
  const data = typeof res.data === "object" ? res.data : JSON.parse(String(res.data || "{}"));
  const root = data.aliexpress_affiliate_hotproduct_query_response || data;
  const products =
    root?.resp_result?.result?.products?.product ||
    root?.result?.products?.product ||
    [];
  const list = Array.isArray(products) ? products : [];
  const ids = list
    .map((p) => String(p?.product_id || p?.item_id || "").trim())
    .filter(Boolean)
    .slice(0, limit);
  if (ids.length === 0) {
    throw new Error("AliExpress hotproduct devolvió 0 IDs");
  }
  return ids;
}

async function getMeliTopIds(limit) {
  const token = String(process.env.MERCADOLIBRE_ACCESS_TOKEN || "").trim();
  if (!token) throw new Error("falta MERCADOLIBRE_ACCESS_TOKEN");
  const base = String(process.env.MERCADOLIBRE_API_URL || "https://api.mercadolibre.com").trim();
  const res = await axios.get(
    `${base}/sites/MLA/search?sort=sold_quantity_desc&limit=${encodeURIComponent(String(limit))}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      timeout: 15000,
      validateStatus: () => true,
    }
  );
  if (res.status >= 400) {
    throw new Error(`Meli search HTTP ${res.status}`);
  }
  const ids = (Array.isArray(res.data?.results) ? res.data.results : [])
    .map((r) => String(r?.id || "").trim())
    .filter(Boolean)
    .slice(0, limit);
  if (ids.length === 0) throw new Error("Meli search devolvió 0 IDs");
  return ids;
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key, value, encoding = undefined) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function buildAmazonSigV4Headers(host, region, accessKey, secretKey, payloadStr, target) {
  const service = "ProductAdvertisingAPI";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = "/paapi5/searchitems";
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const contentType = "application/json; charset=utf-8";
  const payloadHash = sha256Hex(payloadStr);
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  const canonicalRequest = [
    "POST",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const algorithm = "AWS4-HMAC-SHA256";
  const stringToSign = [algorithm, amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign, "hex");
  return {
    "Content-Encoding": "amz-1.0",
    "Content-Type": contentType,
    "X-Amz-Date": amzDate,
    "X-Amz-Target": target,
    Authorization: `${algorithm} Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    Host: host,
  };
}

async function getAmazonTopAsins(limit) {
  const accessKey = String(process.env.AWS_ACCESS_KEY || process.env.AMAZON_AWS_ACCESS_KEY || "").trim();
  const secretKey = String(process.env.AWS_SECRET_KEY || process.env.AMAZON_AWS_SECRET_KEY || "").trim();
  const partnerTag = String(process.env.AMAZON_PARTNER_TAG || "").trim();
  const host = String(process.env.AMAZON_PAAPI_HOST || "webservices.amazon.com").trim();
  const region = String(process.env.AMAZON_PAAPI_REGION || "us-east-1").trim();
  if (!accessKey || !secretKey || !partnerTag) {
    throw new Error("faltan credenciales Amazon PA-API");
  }

  const payload = {
    PartnerTag: partnerTag,
    PartnerType: "Associates",
    Marketplace: "www.amazon.com",
    SearchIndex: "Electronics",
    Keywords: "best sellers",
    ItemCount: Math.min(limit, 50),
    SortBy: "Relevance",
    Resources: ["ItemInfo.Title", "Images.Primary.Large", "Offers.Listings.Price"],
  };
  const payloadStr = JSON.stringify(payload);
  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
  const headers = buildAmazonSigV4Headers(host, region, accessKey, secretKey, payloadStr, target);

  const res = await axios.post(`https://${host}/paapi5/searchitems`, payloadStr, {
    headers,
    timeout: 18000,
    validateStatus: () => true,
  });
  if (res.status >= 400) {
    throw new Error(`Amazon SearchItems HTTP ${res.status}`);
  }
  const items = Array.isArray(res.data?.SearchResult?.Items) ? res.data.SearchResult.Items : [];
  const asins = items.map((i) => String(i?.ASIN || "").trim()).filter(Boolean).slice(0, limit);
  if (asins.length === 0) throw new Error("Amazon SearchItems devolvió 0 ASINs");
  return asins;
}

async function getShopifyTopIds(limit) {
  const host = resolveStoreHost();
  const token = resolveAccessToken();
  if (!host || !token) throw new Error("faltan credenciales Shopify");
  const version = String(process.env.SHOPIFY_API_VERSION || "2024-01").trim();
  const res = await axios.get(
    `https://${host}/admin/api/${version}/products.json?limit=${encodeURIComponent(String(limit))}&order=updated_at desc&fields=id`,
    {
      headers: { "X-Shopify-Access-Token": token, Accept: "application/json" },
      timeout: 15000,
      validateStatus: () => true,
    }
  );
  if (res.status >= 400) {
    throw new Error(`Shopify products HTTP ${res.status}`);
  }
  const ids = (Array.isArray(res.data?.products) ? res.data.products : [])
    .map((p) => String(p?.id || "").trim())
    .filter(Boolean)
    .slice(0, limit);
  if (ids.length === 0) throw new Error("Shopify products devolvió 0 IDs");
  return ids;
}

async function getWooTopIds(limit) {
  const creds = await resolveCredentialsDynamic({});
  if (!creds?.siteUrl || !creds.consumerKey || !creds.consumerSecret) {
    throw new Error("faltan credenciales WooCommerce");
  }
  const site = String(creds.siteUrl).replace(/\/$/, "");
  const res = await axios.get(
    `${site}/wp-json/wc/v3/products?per_page=${encodeURIComponent(String(limit))}&orderby=popularity&order=desc`,
    {
      auth: { username: creds.consumerKey, password: creds.consumerSecret },
      headers: { Accept: "application/json" },
      timeout: 15000,
      validateStatus: () => true,
    }
  );
  if (res.status >= 400) {
    throw new Error(`Woo products HTTP ${res.status}`);
  }
  const ids = (Array.isArray(res.data) ? res.data : [])
    .map((p) => String(p?.id || "").trim())
    .filter(Boolean)
    .slice(0, limit);
  if (ids.length === 0) throw new Error("Woo products devolvió 0 IDs");
  return ids;
}

function buildFallbackIds(prefix, limit) {
  return Array.from({ length: limit }).map((_, i) => `${prefix}${i + 1}`);
}

async function runPlatformExtraction(config) {
  const {
    platform,
    adapter,
    getTopIds,
    fallbackIds,
    normalizeInput = (id) => id,
  } = config;

  const startedAt = Date.now();
  const rows = [];
  let ids = [];
  let source = "api";
  try {
    ids = await getTopIds(LIMIT_PER_PLATFORM);
  } catch (err) {
    source = "fallback_mock";
    ids = fallbackIds(LIMIT_PER_PLATFORM);
    rows.push({
      platform,
      item_ref: null,
      status: "WARN_TOP_LIST_FAILED",
      message: err?.message || String(err),
      validated: false,
      missing: [],
      latency_ms: 0,
      extracted_at: nowIso(),
    });
  }

  for (const rawId of ids.slice(0, LIMIT_PER_PLATFORM)) {
    const input = normalizeInput(rawId);
    const t0 = Date.now();
    try {
      await sleep(SLEEP_MS);
      const normalized = await adapter.getProduct(input);
      if (normalized && normalized.error) {
        rows.push({
          platform,
          item_ref: String(rawId),
          status: "FAILED_ADAPTER_ERROR",
          message: String(normalized.error),
          validated: false,
          missing: [],
          latency_ms: Date.now() - t0,
          extracted_at: nowIso(),
          raw: normalized,
        });
        continue;
      }
      const fifer = toFiferShape(normalized, platform);
      const v = validateFiferProduct(fifer);
      rows.push({
        platform,
        item_ref: String(rawId),
        status: v.ok ? "OK" : "INVALID_DATA",
        message: v.ok ? "" : `Missing: ${v.missing.join(", ")}`,
        validated: v.ok,
        missing: v.missing,
        latency_ms: Date.now() - t0,
        extracted_at: nowIso(),
        data: fifer,
      });
    } catch (err) {
      rows.push({
        platform,
        item_ref: String(rawId),
        status: "FAILED_EXCEPTION",
        message: err?.message || String(err),
        validated: false,
        missing: [],
        latency_ms: Date.now() - t0,
        extracted_at: nowIso(),
      });
    }
  }

  const itemRows = rows.filter((r) => r.item_ref !== null);
  const successful = itemRows.filter((r) => r.status === "OK").length;
  const failed = itemRows.length - successful;
  const avgMs =
    itemRows.length > 0
      ? Math.round(itemRows.reduce((acc, r) => acc + Number(r.latency_ms || 0), 0) / itemRows.length)
      : 0;

  return {
    platform,
    source,
    elapsed_ms_total: Date.now() - startedAt,
    requested_items: LIMIT_PER_PLATFORM,
    processed_items: itemRows.length,
    successful,
    failed,
    avg_ms_per_item: avgMs,
    rows,
  };
}

async function main() {
  printHeader("Affiliate Power-Grid — Mass Extraction Verify (v3.6)");
  const platforms = [
    {
      platform: "aliexpress",
      adapter: new AliExpressAdapter(),
      getTopIds: getAliTopIds,
      fallbackIds: (n) => buildFallbackIds("100500000000", n),
      normalizeInput: (id) => {
        const parsed = extractItemIdFromAliExpressUrl(id);
        return parsed || id;
      },
    },
    {
      platform: "mercadolibre",
      adapter: new MercadoLibreAdapter(),
      getTopIds: getMeliTopIds,
      fallbackIds: (n) => buildFallbackIds("MLA900000", n),
    },
    {
      platform: "amazon",
      adapter: new AmazonAdapter(),
      getTopIds: getAmazonTopAsins,
      fallbackIds: (n) =>
        Array.from({ length: n }).map((_, i) => `B0TEST${String(i + 1).padStart(4, "0")}`.slice(0, 10)),
    },
    {
      platform: "shopify",
      adapter: new ShopifyAdapter(),
      getTopIds: getShopifyTopIds,
      fallbackIds: (n) => buildFallbackIds("shopify-mock-", n),
    },
    {
      platform: "woocommerce",
      adapter: new WooCommerceAdapter(),
      getTopIds: getWooTopIds,
      fallbackIds: (n) => buildFallbackIds("woo-mock-", n),
    },
  ];

  const results = [];
  for (const cfg of platforms) {
    printHeader(`Extrayendo ${cfg.platform} (${LIMIT_PER_PLATFORM} items)`);
    try {
      const result = await runPlatformExtraction(cfg);
      results.push(result);
      console.log(
        `→ ${cfg.platform}: OK=${result.successful} FAIL=${result.failed} AVG=${result.avg_ms_per_item}ms source=${result.source}`
      );
    } catch (err) {
      results.push({
        platform: cfg.platform,
        source: "fatal",
        elapsed_ms_total: 0,
        requested_items: LIMIT_PER_PLATFORM,
        processed_items: 0,
        successful: 0,
        failed: LIMIT_PER_PLATFORM,
        avg_ms_per_item: 0,
        rows: [
          {
            platform: cfg.platform,
            item_ref: null,
            status: "FAILED_PLATFORM_FATAL",
            message: err?.message || String(err),
            validated: false,
            missing: [],
            latency_ms: 0,
            extracted_at: nowIso(),
          },
        ],
      });
      console.error(`✖ ${cfg.platform} fatal:`, err?.message || err);
    }
  }

  const table = results.map((r) => ({
    Plataforma: r.platform,
    Exitosos: r.successful,
    Fallidos: r.failed,
    "Tiempo Promedio por Item (ms)": r.avg_ms_per_item,
  }));

  printHeader("Resumen");
  console.table(table);

  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const report = {
    generated_at: nowIso(),
    settings: { limit_per_platform: LIMIT_PER_PLATFORM, sleep_ms: SLEEP_MS },
    summary: table,
    totals: {
      expected: LIMIT_PER_PLATFORM * 5,
      processed: results.reduce((acc, r) => acc + Number(r.processed_items || 0), 0),
      successful: results.reduce((acc, r) => acc + Number(r.successful || 0), 0),
      failed: results.reduce((acc, r) => acc + Number(r.failed || 0), 0),
    },
    platforms: results,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReporte guardado en: ${REPORT_PATH}\n`);
}

main().catch((err) => {
  console.error("\nError no controlado en mass_extraction_verify:", err?.message || err);
  process.exit(1);
});

