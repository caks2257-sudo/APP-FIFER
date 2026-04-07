const axios = require("axios");
const { BaseAffiliateAdapter } = require("./base_adapter.js");
const { convertToUSD } = require("../../../services/currency_service.js");

const SOURCE = "mercadolibre";
const DEFAULT_MELI_API_URL = "https://api.mercadolibre.com";
const PLACEHOLDER_IMG =
  "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";
let meliWarnedMock = false;

function isGhostMode() {
  return String(process.env.FIFER_GHOST_MODE || "").trim().toLowerCase() === "true";
}

function warnMeliMock(reason) {
  if (meliWarnedMock) return;
  meliWarnedMock = true;
  console.warn(`[meli_adapter] WARN: ${reason}. Activando Mock Mode.`);
}

function readMeliCredentials() {
  return {
    accessToken: String(process.env.MERCADOLIBRE_ACCESS_TOKEN || "").trim(),
    sitePrefix: String(process.env.MERCADOLIBRE_SITE_PREFIX || "MLA").trim().toUpperCase(),
  };
}

function normalizeMeliItemId(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  try {
    const u = new URL(raw);
    const pathId = (u.pathname.match(/\/([A-Z]{3}\d+)(?:[/?#]|$)/i) || [])[1];
    if (pathId) return pathId.toUpperCase();
  } catch {
    // Ignore URL parse errors and continue with raw normalization.
  }

  const compact = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!compact) return "";
  if (/^[A-Z]{3}\d+$/.test(compact)) return compact;
  if (/^\d+$/.test(compact)) {
    const { sitePrefix } = readMeliCredentials();
    return `${sitePrefix}${compact}`;
  }
  const digits = compact.replace(/\D/g, "");
  if (digits) {
    const { sitePrefix } = readMeliCredentials();
    return `${sitePrefix}${digits}`;
  }
  return compact;
}

function normalizeProductToFifer(item, itemId) {
  return {
    external_id: String(item?.id || itemId),
    name: String(item?.title || `Mercado Libre ${itemId}`),
    price: Number(item?.price || 0),
    price_usd: null,
    currency: String(item?.currency_id || "ARS"),
    stock_status:
      item?.available_quantity != null && Number(item.available_quantity) <= 0 ? "out_of_stock" : "in_stock",
    main_image_url: String(item?.pictures?.[0]?.url || item?.thumbnail || PLACEHOLDER_IMG),
    source_store: SOURCE,
    commission_rate: null,
    description: String(item?.title || ""),
    product_url: String(item?.permalink || ""),
    category: String(item?.category_id || "general"),
    provider: SOURCE,
    raw: item,
    raw_data: item,
  };
}

function buildMeliMockProduct(itemId) {
  const normalizedId = normalizeMeliItemId(itemId) || "MLA0000000";
  const raw = {
    id: normalizedId,
    title: `[MOCK Meli] Producto ${normalizedId}`,
    price: 32.5,
    currency_id: "USD",
    available_quantity: 8,
    permalink: `https://articulo.mercadolibre.com.ar/${normalizedId}`,
    pictures: [{ url: PLACEHOLDER_IMG }],
    category_id: "MLA-MOCK",
    commission_rate: "8%",
  };
  return normalizeProductToFifer(raw, normalizedId);
}

class MercadoLibreAdapter extends BaseAffiliateAdapter {
  get providerId() {
    return SOURCE;
  }

  async getProduct(itemId, options = {}) {
    const normalizedId = normalizeMeliItemId(itemId);
    if (!normalizedId) {
      throw new Error("mercadolibre: itemId inválido");
    }
    const { accessToken } = readMeliCredentials();
    if (isGhostMode()) {
      warnMeliMock("FIFER_GHOST_MODE=true");
      const mock = buildMeliMockProduct(normalizedId);
      const converted = await convertToUSD(mock.price, mock.currency);
      return { ...mock, price_usd: converted.amount_usd };
    }
    if (!accessToken) {
      warnMeliMock("falta MERCADOLIBRE_ACCESS_TOKEN");
      const mock = buildMeliMockProduct(normalizedId);
      const converted = await convertToUSD(mock.price, mock.currency);
      return { ...mock, price_usd: converted.amount_usd };
    }
    const baseUrl = String(process.env.MERCADOLIBRE_API_URL || DEFAULT_MELI_API_URL).trim();
    const endpoint = `${baseUrl}/items/${encodeURIComponent(normalizedId)}`;
    let response;
    try {
      response = await axios.get(endpoint, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        timeout:
          Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
            ? Number(options.timeoutMs)
            : Number(process.env.MELI_AXIOS_TIMEOUT_MS || 15000),
        validateStatus: () => true,
      });
    } catch (err) {
      throw new Error(`mercadolibre: error de red — ${err?.message || String(err)}`);
    }
    if (!response || response.status >= 400) {
      const details = response?.data ? JSON.stringify(response.data).slice(0, 500) : "";
      throw new Error(`mercadolibre: HTTP ${response?.status || "error"} ${details}`);
    }
    const normalized = normalizeProductToFifer(response.data, normalizedId);
    const converted = await convertToUSD(normalized.price, normalized.currency);
    return { ...normalized, price_usd: converted.amount_usd };
  }

  async checkStock(itemId, options = {}) {
    const p = await this.getProduct(itemId, options);
    return {
      available: p.stock_status === "in_stock",
      quantity:
        p.raw && p.raw.available_quantity != null ? Number(p.raw.available_quantity) || 0 : null,
      stock_status: p.stock_status,
      raw: p.raw,
    };
  }

  /**
   * Fast-Sync JIT hydration: stock batch sin IA.
   * @param {string[]} ids
   * @param {{ timeoutMs?: number, concurrency?: number }} [options]
   * @returns {Promise<Array<{ id: string, stock_status: "in_stock" | "out_of_stock" | "unknown", updated_price: number | null, currency?: string }>>}
   */
  async checkStockBatch(ids, options = {}) {
    const uniqueIds = Array.from(
      new Set((Array.isArray(ids) ? ids : []).map((id) => normalizeMeliItemId(id)).filter(Boolean))
    );
    const concurrency = Math.max(1, Number(options.concurrency || 6));
    const timeoutMs = Math.max(300, Number(options.timeoutMs || 2500));

    /** @type {Array<{ id: string, stock_status: "in_stock" | "out_of_stock" | "unknown", updated_price: number | null, currency?: string }>} */
    const out = [];
    for (let i = 0; i < uniqueIds.length; i += concurrency) {
      const chunk = uniqueIds.slice(i, i + concurrency);
      const settled = await Promise.allSettled(
        chunk.map((id) =>
          this.getProduct(id, { timeoutMs }).then((p) => ({
            id,
            stock_status:
              p.stock_status === "in_stock" || p.stock_status === "out_of_stock"
                ? p.stock_status
                : "unknown",
            updated_price: Number.isFinite(Number(p.price)) ? Number(p.price) : null,
            currency: p.currency || "ARS",
          }))
        )
      );
      for (let j = 0; j < settled.length; j++) {
        const s = settled[j];
        if (s.status === "fulfilled") {
          out.push(s.value);
        } else {
          out.push({
            id: chunk[j],
            stock_status: "unknown",
            updated_price: null,
            currency: "ARS",
          });
        }
      }
    }
    return out;
  }

  async getPrice(itemId, options = {}) {
    const p = await this.getProduct(itemId, options);
    return {
      amount: Number(p.price) || 0,
      currency: p.currency || "ARS",
      raw: p.raw,
    };
  }
}

module.exports = {
  MercadoLibreAdapter,
  normalizeMeliItemId,
  readMeliCredentials,
};

