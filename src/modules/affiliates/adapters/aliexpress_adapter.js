/**
 * AliExpress — Real-Time API Adapter (v3.4+).
 * Firma TOP/AliExpress Open Platform (MD5) y llamada a `aliexpress.affiliate.productdetail.get`.
 *
 * Env obligatorios: ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET
 * Opcional: ALIEXPRESS_TRACKING_ID (enlaces afiliado; no siempre requerido por la API),
 *           ALIEXPRESS_ACCESS_TOKEN (si tu app usa token de sesión),
 *           ALIEXPRESS_API_URL (default: https://api-sg.aliexpress.com/rest — APIs de negocio)
 */
const axios = require("axios");
const crypto = require("crypto");
const { BaseAffiliateAdapter } = require("./base_adapter.js");

const SOURCE = "aliexpress";

/** APIs de negocio (product detail, etc.). Las rutas /sync suelen ser solo sistema/auth. */
const DEFAULT_AE_API_URL = "https://api-sg.aliexpress.com/rest";

const PLACEHOLDER_IMG =
  "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";
let aliWarnedMock = false;

function isGhostMode() {
  return (
    String(process.env.FIFER_GHOST_MODE || "").trim().toLowerCase() === "true" ||
    String(process.env.ALIEXPRESS_FORCE_MOCK || "").trim().toLowerCase() === "true"
  );
}

function warnAliMock(reason) {
  if (aliWarnedMock) return;
  aliWarnedMock = true;
  console.warn(`[aliexpress_adapter] WARN: ${reason}. Activando Mock Mode.`);
}

function readEnvCredentials() {
  return {
    appKey: String(process.env.ALIEXPRESS_APP_KEY || "").trim(),
    appSecret: String(process.env.ALIEXPRESS_APP_SECRET || "").trim(),
    trackingId: String(process.env.ALIEXPRESS_TRACKING_ID || "").trim(),
  };
}

/**
 * Firma estándar AliExpress / Taobao Open Platform (sign_method=md5):
 * ordenar claves ASCII, concatenar key+value, luego MD5(secret + cadena + secret) en HEX mayúsculas.
 * @param {Record<string, string | number | boolean>} params Sin `sign`
 * @param {string} appSecret
 */
function generateSign(params, appSecret) {
  const secret = String(appSecret || "");
  const keys = Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== undefined && params[k] !== null)
    .sort();
  const concatenated = keys.map((k) => `${k}${String(params[k])}`).join("");
  return crypto
    .createHash("md5")
    .update(`${secret}${concatenated}${secret}`, "utf8")
    .digest("hex")
    .toUpperCase();
}

/** Timestamp YYYY-MM-DD HH:mm:ss en Asia/Shanghai (recomendado por la documentación de afiliados). */
function formatTimestampAsiaShanghai() {
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

/**
 * @param {string} urlOrId
 * @returns {string|null}
 */
function extractItemIdFromAliExpressUrl(urlOrId) {
  const raw = String(urlOrId || "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    const pathMatch = u.pathname.match(/\/item\/(\d+)/i);
    if (pathMatch) return pathMatch[1];
    const qp = u.searchParams.get("item_id") || u.searchParams.get("itemId");
    if (qp && /^\d+$/.test(qp)) return qp;
  } catch {
    const m = raw.match(/\/item\/(\d+)/i);
    if (m) return m[1];
  }
  return null;
}

/**
 * Extrae el primer producto y detecta errores API en el JSON.
 * Ruta documentada: resp_result.result.product_details.product[]
 */
function extractAffiliateProductDetailPayload(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return { error: { msg: "respuesta vacía o no JSON" }, product: null, full: parsed };
  }
  if (parsed.error_response) {
    return { error: parsed.error_response, product: null, full: parsed };
  }

  const root = parsed.aliexpress_affiliate_productdetail_get_response || parsed;

  const respResult = root?.resp_result || root?.response;
  const codeOk =
    respResult?.resp_code == null ||
    String(respResult.resp_code) === "200" ||
    Number(respResult.resp_code) === 200;
  if (respResult?.resp_code != null && !codeOk) {
    return {
      error: {
        resp_code: respResult.resp_code,
        resp_msg: respResult.resp_msg,
      },
      product: null,
      full: parsed,
    };
  }

  const result = respResult?.result;
  const pd = result?.product_details;
  let products = pd?.product ?? pd?.products;
  if (products && !Array.isArray(products)) {
    products = [products];
  }
  const product = Array.isArray(products) && products.length ? products[0] : null;
  return { error: null, product, full: parsed };
}

function pickFirstString(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

/**
 * @param {object} p — elemento de product[]
 * @param {string} itemId — fallback
 * @param {object} fullJson — respuesta API completa → raw
 */
function mapAliExpressProductToFifer(p, itemId, fullJson) {
  const title = pickFirstString(
    p.product_title,
    p.title,
    p.subject,
    p.product_name
  );
  const priceRaw = pickFirstString(
    p.target_sale_price,
    p.sale_price,
    p.app_sale_price,
    p.discount_price,
    p.original_price
  );
  const price = parseFloat(priceRaw) || 0;
  const img = pickFirstString(
    p.product_main_image_url,
    p.image_url,
    p.main_image_url,
    p.product_small_image_urls
  );
  const page = pickFirstString(
    p.product_detail_url,
    p.product_url,
    p.promotion_link,
    p.url
  );
  const extId = pickFirstString(p.product_id, p.item_id, itemId) || itemId;

  return {
    external_id: String(extId),
    name: title || `AliExpress ${itemId}`,
    price: Math.round(price * 100) / 100,
    currency: pickFirstString(p.target_currency, p.currency) || "USD",
    stock_status: "in_stock",
    main_image_url: img || PLACEHOLDER_IMG,
    source_store: SOURCE,
    commission_rate: pickFirstString(p.commission_rate) || null,
    description: pickFirstString(p.description, p.product_description) || title,
    product_id: String(extId),
    image_url: img || PLACEHOLDER_IMG,
    product_url: page || `https://www.aliexpress.com/item/${itemId}.html`,
    affiliate_url: page || `https://www.aliexpress.com/item/${itemId}.html`,
    category: pickFirstString(p.first_level_category_name, p.category_name) || "general",
    provider: SOURCE,
    raw: fullJson,
    raw_data: fullJson,
  };
}

/**
 * POST aliexpress.affiliate.productdetail.get (form urlencoded, firma md5).
 * @param {string} itemId
 * @param {string} [productPageUrl]
 */
async function fetchAffiliateProductDetail(itemId, productPageUrl = "") {
  const creds = readEnvCredentials();
  if (!creds.appKey || !creds.appSecret) {
    throw new Error(
      "aliexpress: definen ALIEXPRESS_APP_KEY y ALIEXPRESS_APP_SECRET para la API real"
    );
  }

  const timestamp = formatTimestampAsiaShanghai();
  /** @type {Record<string, string>} */
  const params = {
    method: "aliexpress.affiliate.productdetail.get",
    app_key: creds.appKey,
    timestamp,
    sign_method: "md5",
    format: "json",
    v: "2.0",
    product_ids: String(itemId),
    target_currency: "USD",
    target_language: "EN",
  };

  const token = String(process.env.ALIEXPRESS_ACCESS_TOKEN || "").trim();
  if (token) {
    params.access_token = token;
  }

  const sign = generateSign(params, creds.appSecret);
  const withSign = { ...params, sign };

  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(withSign)) {
    form.append(k, String(v));
  }

  const apiUrl = String(process.env.ALIEXPRESS_API_URL || DEFAULT_AE_API_URL).trim();
  const timeoutMs = Number(process.env.ALIEXPRESS_AXIOS_TIMEOUT_MS || 30000);

  let res;
  try {
    res = await axios.post(apiUrl, form.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      timeout: timeoutMs,
      validateStatus: () => true,
    });
  } catch (err) {
    const msg = err?.response?.data
      ? JSON.stringify(err.response.data).slice(0, 800)
      : err?.message || String(err);
    throw new Error(`aliexpress: error de red o timeout — ${msg}`);
  }

  const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  let parsed;
  try {
    parsed = typeof res.data === "object" && res.data !== null ? res.data : JSON.parse(text || "{}");
  } catch (e) {
    throw new Error(
      `aliexpress: respuesta no JSON (HTTP ${res.status}) — ${String(text).slice(0, 500)}`
    );
  }

  if (res.status >= 400) {
    throw new Error(
      `aliexpress: HTTP ${res.status} — ${JSON.stringify(parsed).slice(0, 1200)}`
    );
  }

  const { error, product, full } = extractAffiliateProductDetailPayload(parsed);

  if (error && !product) {
    throw new Error(
      `aliexpress: API error — ${JSON.stringify(error)}`
    );
  }

  if (!product) {
    throw new Error(
      `aliexpress: sin product_details.product[0] en la respuesta — ${JSON.stringify(parsed).slice(0, 1500)}`
    );
  }

  return mapAliExpressProductToFifer(product, itemId, full);
}

function buildGhostMockProduct(itemId, productPageUrl = "") {
  const page = productPageUrl || `https://www.aliexpress.com/item/${itemId}.html`;
  return {
    external_id: String(itemId),
    name: `AliExpress Ghost Product ${itemId}`,
    price: 19.9,
    currency: "USD",
    stock_status: "in_stock",
    main_image_url: PLACEHOLDER_IMG,
    source_store: SOURCE,
    commission_rate: "10%",
    description: "Ghost Mode: producto simulado para desarrollo local.",
    product_id: String(itemId),
    image_url: PLACEHOLDER_IMG,
    product_url: page,
    affiliate_url: page,
    category: "general",
    provider: SOURCE,
    raw: {
      aliexpress_affiliate_productdetail_get_response: {
        resp_result: {
          resp_code: "200",
          resp_msg: "success",
          result: {
            product_details: {
              product: [
                {
                  product_id: String(itemId),
                  product_title: `AliExpress Ghost Product ${itemId}`,
                  target_sale_price: "19.90",
                  target_currency: "USD",
                  commission_rate: "10%",
                  evaluate_rate: "4.8",
                  first_level_category_name: "general",
                },
              ],
            },
          },
        },
      },
    },
    raw_data: {
      mock: true,
      provider: SOURCE,
      commission_rate: "10%",
    },
  };
}

class AliExpressAdapter extends BaseAffiliateAdapter {
  get providerId() {
    return SOURCE;
  }

  /**
   * @param {string} urlOrId URL de producto AliExpress o ID numérico
   * @param {object} [options]
   */
  async getProduct(urlOrId, options = {}) {
    const itemId = extractItemIdFromAliExpressUrl(urlOrId);
    if (!itemId) {
      throw new Error(
        "aliexpress: se requiere URL de producto (/item/123...) o id numérico"
      );
    }
    const page =
      options.productPageUrl ||
      (String(urlOrId).includes("http") ? String(urlOrId) : "");
    if (isGhostMode()) {
      warnAliMock("FIFER_GHOST_MODE=true o ALIEXPRESS_FORCE_MOCK=true");
      return buildGhostMockProduct(itemId, page);
    }
    const creds = readEnvCredentials();
    if (!creds.appKey || !creds.appSecret) {
      warnAliMock("faltan ALIEXPRESS_APP_KEY/ALIEXPRESS_APP_SECRET");
      return buildGhostMockProduct(itemId, page);
    }
    try {
      return await fetchAffiliateProductDetail(itemId, page);
    } catch (err) {
      const base = err?.message || String(err);
      throw new Error(base);
    }
  }

  async checkStock(productId, options = {}) {
    const p = await this.getProduct(productId, options);
    return {
      available: p.stock_status === "in_stock",
      quantity: null,
      stock_status: p.stock_status,
      raw: p.raw,
    };
  }

  /**
   * Fast-Sync JIT hydration: batch stock/price sin IA.
   * @param {string[]} ids
   * @param {{ concurrency?: number }} [options]
   * @returns {Promise<Array<{ id: string, stock_status: "in_stock" | "out_of_stock" | "unknown", updated_price: number | null, currency?: string }>>}
   */
  async checkStockBatch(ids, options = {}) {
    const normalizedIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [])
          .map((id) => extractItemIdFromAliExpressUrl(id))
          .filter(Boolean)
      )
    );
    const concurrency = Math.max(1, Number(options.concurrency || 6));

    /** @type {Array<{ id: string, stock_status: "in_stock" | "out_of_stock" | "unknown", updated_price: number | null, currency?: string }>} */
    const out = [];
    for (let i = 0; i < normalizedIds.length; i += concurrency) {
      const chunk = normalizedIds.slice(i, i + concurrency);
      const settled = await Promise.allSettled(
        chunk.map((id) =>
          this.getProduct(id).then((p) => ({
            id,
            stock_status:
              p.stock_status === "in_stock" || p.stock_status === "out_of_stock"
                ? p.stock_status
                : "unknown",
            updated_price: Number.isFinite(Number(p.price)) ? Number(p.price) : null,
            currency: p.currency || "USD",
          }))
        )
      );
      for (let j = 0; j < settled.length; j++) {
        const s = settled[j];
        if (s.status === "fulfilled") {
          out.push(s.value);
        } else {
          out.push({
            id: String(chunk[j]),
            stock_status: "unknown",
            updated_price: null,
            currency: "USD",
          });
        }
      }
    }
    return out;
  }

  async getPrice(productId, options = {}) {
    const data = await this.getProduct(productId, options);
    return {
      amount: Number(data.price) || 0,
      currency: data.currency || "USD",
      raw: data.raw,
    };
  }
}

module.exports = {
  AliExpressAdapter,
  extractItemIdFromAliExpressUrl,
  readEnvCredentials,
  /** Para Tag-Center / pipelines: primer producto + payload completo */
  parseAffiliateProductDetailResponse: extractAffiliateProductDetailPayload,
};
