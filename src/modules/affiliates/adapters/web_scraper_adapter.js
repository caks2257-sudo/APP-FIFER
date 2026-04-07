/**
 * Web Ingestion Node (v3.0) — descarga HTML y extrae señales para campaña.
 * Axios (servidor) + cheerio; sin CORS en backend; sitios con bloqueo pueden fallar (try/catch).
 */
const crypto = require("crypto");
const axios = require("axios");
const cheerio = require("cheerio");

const DEFAULT_UA = "FIFER-WebIngest/3.0 (+https://fifer.local; Intelligent Campaign Manager)";
const FETCH_TIMEOUT_MS = 20000;

function stableExternalId(url) {
  return crypto.createHash("sha256").update(String(url).trim()).digest("hex").slice(0, 40);
}

function normalizeText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} html
 * @param {string} pageUrl
 */
function extractFromHtml(html, pageUrl) {
  const $ = cheerio.load(html);

  const title =
    normalizeText($("title").first().text()) ||
    normalizeText($('meta[property="og:title"]').attr("content")) ||
    normalizeText($('meta[name="twitter:title"]').attr("content")) ||
    "Sin título";

  const metaDesc =
    normalizeText($('meta[name="description"]').attr("content")) ||
    normalizeText($('meta[property="og:description"]').attr("content")) ||
    "";

  const paragraphs = [];
  $("p").each((_, el) => {
    if (paragraphs.length >= 3) return false;
    const t = normalizeText($(el).text());
    if (t.length > 20) paragraphs.push(t);
    return undefined;
  });

  const ogImage =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="og:image"]').attr("content") ||
    "";

  const description =
    metaDesc ||
    paragraphs.slice(0, 2).join(" ") ||
    title;

  const externalId = stableExternalId(pageUrl);

  return {
    external_id: externalId,
    name: title.slice(0, 500),
    description: description.slice(0, 8000),
    price: 0,
    currency: "USD",
    stock_status: "unknown",
    main_image_url: ogImage || "",
    source_store: "web_ingestion",
    product_id: externalId,
    image_url: ogImage || "",
    product_url: pageUrl,
    affiliate_url: "",
    category: "web_campaign",
    provider: "web_scraper",
    paragraphs,
    raw: {
      meta_description: metaDesc,
      paragraph_count: paragraphs.length,
    },
  };
}

/**
 * @param {string} url
 * @returns {Promise<{ ok: true, data: object } | { ok: false, error: string, code?: string }>}
 */
async function scrapeUrlToFifer(url) {
  let parsed;
  try {
    parsed = new URL(String(url).trim());
  } catch {
    return { ok: false, error: "URL inválida", code: "invalid_url" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Solo http/https", code: "invalid_protocol" };
  }

  try {
    const res = await axios.get(parsed.href, {
      timeout: FETCH_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
      headers: {
        "User-Agent": process.env.FIFER_WEB_SCRAPER_UA || DEFAULT_UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
      responseType: "text",
    });

    const html = typeof res.data === "string" ? res.data : String(res.data ?? "");
    if (!html || html.length < 50) {
      return {
        ok: false,
        error: "Respuesta HTML vacía o demasiado corta (posible bloqueo o CAPTCHA)",
        code: "empty_body",
      };
    }

    const data = extractFromHtml(html, parsed.href);
    return { ok: true, data };
  } catch (err) {
    const msg = err.response
      ? `HTTP ${err.response.status}: ${err.response.statusText || "error"}`
      : err.code === "ECONNABORTED"
        ? "Timeout al descargar la página"
        : err.message || String(err);
    return {
      ok: false,
      error: msg,
      code: err.code || "fetch_error",
    };
  }
}

module.exports = {
  scrapeUrlToFifer,
  stableExternalId,
  extractFromHtml,
};
