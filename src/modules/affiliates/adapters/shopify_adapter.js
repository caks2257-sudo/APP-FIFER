/**
 * Shopify — v1 orientado a mock (simulación de latencia API + JSON FIFER v2.8).
 * Credenciales solo por env. Con credenciales completas y sin FEATURE_SHOPIFY_MOCK,
 * puede llamar Admin REST.
 *
 * Env (v2.8 X-Ray): SHOPIFY_API_KEY, SHOPIFY_STORE_URL (también: SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN).
 */
const { BaseAffiliateAdapter } = require("./base_adapter.js");

function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/** URL o dominio myshopify, sin path final obligatorio */
function resolveStoreHost() {
  const raw = String(
    process.env.SHOPIFY_STORE_URL || process.env.SHOPIFY_STORE_DOMAIN || ""
  ).trim();
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .split("/")[0]
    .trim();
}

function resolveAccessToken() {
  return String(
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_API_KEY || ""
  ).trim();
}

function shopifyCredentialsReady() {
  const host = resolveStoreHost();
  const token = resolveAccessToken();
  return Boolean(host && token);
}

function mockSimulatedDelayMs() {
  const n = Number(process.env.SHOPIFY_MOCK_DELAY_MS);
  return Number.isFinite(n) && n >= 0 ? n : 25;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} productId
 * @returns {object} FIFER v2.8 + campos compatibles con ingest / bridge_hook
 */
function buildMockFiferProduct(productId) {
  const id = String(productId || "mock-product");
  const qty = 12;
  return {
    external_id: id,
    name: `[MOCK Shopify] Product ${id}`,
    price: 19.99,
    currency: "USD",
    stock_status: "in_stock",
    main_image_url:
      "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png",
    source_store: "shopify",
    commission_rate: null,
    description:
      "Simulación v1 — configura SHOPIFY_STORE_URL + SHOPIFY_API_KEY y desactiva FEATURE_SHOPIFY_MOCK para API real.",
    product_id: id,
    image_url:
      "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png",
    product_url: `https://${resolveStoreHost() || "example.myshopify.com"}/products/${id}`,
    affiliate_url: "",
    category: "mock",
    provider: "shopify",
    raw: { mock: true, simulated_api: true, inventory_quantity: qty },
    raw_data: { mock: true, simulated_api: true, inventory_quantity: qty },
  };
}

function mapShopifyProductToFifer(product) {
  const firstVariant = product?.variants?.[0];
  const firstImage = product?.images?.[0];
  const price = parseFloat(firstVariant?.price || "0") || 0;
  const qty =
    firstVariant?.inventory_quantity != null
      ? Number(firstVariant.inventory_quantity)
      : null;
  const host = resolveStoreHost();
  const handle = product?.handle || String(product?.id || "");
  const extId = String(product?.id ?? "");
  const inStock = qty == null ? true : qty > 0;
  return {
    external_id: extId,
    name: String(product?.title || "Untitled"),
    price,
    currency: "USD",
    stock_status: inStock ? "in_stock" : "out_of_stock",
    main_image_url: firstImage?.src || "",
    source_store: "shopify",
    commission_rate: null,
    description: String(product?.body_html || "")
      .replace(/<[^>]+>/g, " ")
      .trim(),
    product_id: extId,
    image_url: firstImage?.src || "",
    product_url: host ? `https://${host}/products/${handle}` : "",
    affiliate_url: "",
    category: product?.product_type || "general",
    provider: "shopify",
    raw: {
      variant_id: firstVariant?.id,
      inventory_quantity: qty,
    },
    raw_data: {
      variant_id: firstVariant?.id,
      inventory_quantity: qty,
    },
  };
}

class ShopifyAdapter extends BaseAffiliateAdapter {
  get providerId() {
    return "shopify";
  }

  useMock() {
    return truthy(process.env.FEATURE_SHOPIFY_MOCK) || !shopifyCredentialsReady();
  }

  async getProduct(productId, options = {}) {
    const id = String(productId || "").trim();
    if (!id) {
      throw new Error("shopify: productId requerido");
    }

    if (this.useMock()) {
      await sleep(mockSimulatedDelayMs());
      return buildMockFiferProduct(id);
    }

    const host = resolveStoreHost();
    const token = resolveAccessToken();
    const version = String(process.env.SHOPIFY_API_VERSION || "2024-01").trim();
    const url = `https://${host}/admin/api/${version}/products/${id}.json`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Shopify-Access-Token": token,
      },
      signal: options.signal,
    });

    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { parse_error: true, raw: text?.slice(0, 500) };
    }

    if (!res.ok) {
      const err = new Error(`shopify API ${res.status}: ${body?.errors || text?.slice(0, 200) || "error"}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }

    const product = body?.product;
    if (!product) {
      throw new Error("shopify: respuesta sin product");
    }

    return mapShopifyProductToFifer(product);
  }

  async checkStock(productId, options = {}) {
    const p = await this.getProduct(productId, options);
    const qty = p.raw?.inventory_quantity;
    const status = p.stock_status || (qty != null && qty > 0 ? "in_stock" : "out_of_stock");
    return {
      available: status === "in_stock",
      quantity: qty != null ? qty : null,
      stock_status: status,
      raw: p.raw,
    };
  }

  async getPrice(productId, options = {}) {
    const data = await this.getProduct(productId, options);
    return {
      amount: Number(data.price) || 0,
      currency: data.currency || "USD",
      raw: data.raw,
    };
  }

  /** @deprecated usar getProduct */
  async getProductData(productId, options = {}) {
    return this.getProduct(productId, options);
  }
}

module.exports = {
  ShopifyAdapter,
  shopifyCredentialsReady,
  resolveAccessToken,
  resolveStoreHost,
};
