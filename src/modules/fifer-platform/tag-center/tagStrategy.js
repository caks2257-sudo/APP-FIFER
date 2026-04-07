/**
 * Tag-Center — estrategia con metadatos nativos (APIs universales) v3.4.
 * El microservicio Tag-Center debe usar `llm_strategy_brief` + `native_product_metrics` en el prompt del LLM.
 */

const {
  parseAffiliateProductDetailResponse,
} = require("../../affiliates/adapters/aliexpress_adapter.js");

function firstDefined(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

/**
 * Extrae comisión, rating y categoría del objeto producto AliExpress (affiliate API).
 * @param {object|null|undefined} p
 */
function extractNativeMetricsFromAliExpressProduct(p) {
  if (!p || typeof p !== "object") return null;
  const commission = firstDefined(
    p.commission_rate,
    p.hot_product_commission_rate,
    p.relevant_market_commission_rate
  );
  const evaluate = firstDefined(p.evaluate_rate, p.item_evaluate_rate, p.evaluateRate);
  const category = firstDefined(
    p.first_level_category_name,
    p.category_name,
    p.second_level_category_name
  );
  const evStr = evaluate != null ? String(evaluate) : "";
  const ratingNum = parseFloat(evStr.replace(/[^\d.]/g, ""));
  return {
    commission_rate: commission != null ? String(commission) : null,
    evaluate_rate: evaluate != null ? String(evaluate) : null,
    category: category != null ? String(category) : null,
    rating: Number.isFinite(ratingNum) ? ratingNum : null,
  };
}

/**
 * Construye `raw_product_data` para respuesta Master + draft DB desde producto AliExpress normalizado.
 * @param {object} normalized — salida de AliExpressAdapter.getProduct
 */
function buildRawProductDataFromAliExpressNormalized(normalized) {
  const raw = normalized?.raw;
  const parsed = raw && typeof raw === "object" ? raw : null;
  let product = null;
  if (parsed) {
    const ex = parseAffiliateProductDetailResponse(parsed);
    product = ex.product;
  }
  const metrics = extractNativeMetricsFromAliExpressProduct(product);
  return {
    source: "aliexpress_api",
    price: normalized.price ?? null,
    currency: normalized.currency || "USD",
    category: metrics?.category || normalized.category || null,
    commission_rate: metrics?.commission_rate ?? null,
    evaluate_rate: metrics?.evaluate_rate ?? null,
    rating: metrics?.rating ?? null,
    product_id: normalized.external_id,
    /** Respuesta cruda completa de la API (Rayos X backend) */
    api_response: raw ?? null,
  };
}

/**
 * Metadatos mínimos cuando solo hay web scrape (sin comisión/rating de marketplace).
 * @param {object} d — datos `scrapeUrlToFifer`.data
 */
function buildRawProductDataFromWebScrape(d) {
  return {
    source: "web_scrape",
    price: d.price != null ? Number(d.price) : null,
    currency: d.currency || "USD",
    category: d.category || null,
    commission_rate: null,
    evaluate_rate: null,
    rating: null,
    product_id: d.external_id,
    api_response: null,
  };
}

/**
 * Texto de instrucción para el LLM del Tag-Center (sustituye “extrae tags básicos del texto”).
 * @param {object} native — métricas nativas
 */
function buildLlmStrategyBrief(native = {}) {
  const lines = [
    "Tag-Center v3.4 — Genera una ESTRATEGIA DE VENTA (ángulo, audiencia, urgencia, prueba social) usando los METADATOS NATIVOS.",
    "No infieras solo desde el texto plano: prioriza comisión, valoración (evaluate_rate) y categoría si existen.",
    "Devuelve tags[] como lista de strings cortos (slugs/keywords) compatibles con el bot de Marketing.",
    `commission_rate (afiliado): ${native.commission_rate ?? "n/d"}`,
    `evaluate_rate / confianza tienda: ${native.evaluate_rate ?? "n/d"}`,
    `category: ${native.category ?? "n/d"}`,
    `precio referencia: ${native.price != null ? native.price : "n/d"} ${native.currency || ""}`.trim(),
    `rating numérico (si aplica): ${native.rating != null ? native.rating : "n/d"}`,
  ];
  return lines.join("\n");
}

/**
 * Enriquece el body enviado al nodo Tag-Center (POST) sin romper el contrato previo.
 * @param {object} body
 * @param {{ raw_product_data?: object|null }} ctx
 */
function enrichTagCenterRequestBody(body, ctx = {}) {
  const raw = ctx.raw_product_data;
  if (!raw || typeof raw !== "object") {
    return { ...body };
  }
  const native = {
    commission_rate: raw.commission_rate,
    evaluate_rate: raw.evaluate_rate,
    category: raw.category,
    rating: raw.rating,
    price: raw.price,
    currency: raw.currency,
    source: raw.source,
  };
  return {
    ...body,
    native_product_metrics: native,
    llm_strategy_brief: buildLlmStrategyBrief(native),
    strategy_prompt_version: "3.4_native_metrics",
  };
}

/**
 * Pasa `raw_product_data` al payload de salida del pipeline de ventas.
 * @param {object} data
 * @param {{ raw_product_data?: object|null }} options
 */
function attachRawProductDataToPipelineData(data, options = {}) {
  if (!data || typeof data !== "object") return data;
  if (options.raw_product_data == null) return { ...data };
  return { ...data, raw_product_data: options.raw_product_data };
}

module.exports = {
  extractNativeMetricsFromAliExpressProduct,
  buildRawProductDataFromAliExpressNormalized,
  buildRawProductDataFromWebScrape,
  buildLlmStrategyBrief,
  enrichTagCenterRequestBody,
  attachRawProductDataToPipelineData,
};
