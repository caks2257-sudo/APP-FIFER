const axios = require("axios");
const { BaseAffiliateAdapter } = require("./base_adapter.js");
const { createClient } = require("@supabase/supabase-js");

const SOURCE = "woocommerce";
const PLACEHOLDER_IMG =
  "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";
let wooWarnedMock = false;

function isGhostMode() {
  return String(process.env.FIFER_GHOST_MODE || "").trim().toLowerCase() === "true";
}

function warnWooMock(reason) {
  if (wooWarnedMock) return;
  wooWarnedMock = true;
  console.warn(`[woocommerce_adapter] WARN: ${reason}. Activando Mock Mode.`);
}

function readWooCredentials() {
  return {
    siteUrl: String(process.env.WOOCOMMERCE_SITE_URL || process.env.WC_SITE_URL || "").trim(),
    consumerKey: String(
      process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY || ""
    ).trim(),
    consumerSecret: String(
      process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET || ""
    ).trim(),
  };
}

function getSupabaseServiceClient() {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function credentialsReady() {
  const c = readWooCredentials();
  return Boolean(c.siteUrl && c.consumerKey && c.consumerSecret);
}

function normalizeSiteUrl(raw) {
  const s = String(raw || "").trim().replace(/\/$/, "");
  if (!s) return "";
  if (s.startsWith("https://")) return s;
  if (s.startsWith("http://")) return `https://${s.slice("http://".length)}`;
  return `https://${s}`;
}

function extractIdOrSlug(idOrSlug) {
  const raw = String(idOrSlug || "").trim();
  if (!raw) return { mode: "invalid", value: "" };
  if (/^\d+$/.test(raw)) return { mode: "id", value: raw };
  try {
    const u = new URL(raw);
    const pathname = u.pathname.replace(/\/+$/, "");
    const parts = pathname.split("/").filter(Boolean);
    const productIdx = parts.findIndex((p) => p.toLowerCase() === "product");
    if (productIdx >= 0 && parts[productIdx + 1]) {
      return { mode: "slug", value: parts[productIdx + 1] };
    }
    const last = parts[parts.length - 1];
    if (last && !/^\d+$/.test(last)) return { mode: "slug", value: last };
  } catch {
    // ignore URL parse failure
  }
  return { mode: "slug", value: raw.replace(/^\/+|\/+$/g, "") };
}

async function resolveCredentialsDynamic(options = {}) {
  const explicit = options.credentials && typeof options.credentials === "object" ? options.credentials : null;
  if (explicit) {
    const siteUrl = String(explicit.store_url || explicit.siteUrl || "").trim();
    const consumerKey = String(explicit.consumer_key || explicit.consumerKey || "").trim();
    const consumerSecret = String(explicit.consumer_secret || explicit.consumerSecret || "").trim();
    if (siteUrl && consumerKey && consumerSecret) {
      return { siteUrl, consumerKey, consumerSecret, source: "request" };
    }
  }

  const targetStore = normalizeSiteUrl(options.store_url || options.storeUrl || "");
  if (targetStore) {
    try {
      const client = getSupabaseServiceClient();
      if (client) {
        const { data, error } = await client
          .schema("fifer_platform")
          .from("store_connections")
          .select("store_url,consumer_key,consumer_secret")
          .eq("provider", "woocommerce")
          .eq("store_url", targetStore)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          const siteUrl = String(data.store_url || "").trim();
          const consumerKey = String(data.consumer_key || "").trim();
          const consumerSecret = String(data.consumer_secret || "").trim();
          if (siteUrl && consumerKey && consumerSecret) {
            return { siteUrl, consumerKey, consumerSecret, source: "db_store_connections" };
          }
        }
      }
    } catch {
      // optional dynamic store lookup; ignore failure
    }
  }

  const env = readWooCredentials();
  if (env.siteUrl && env.consumerKey && env.consumerSecret) {
    return { ...env, source: "env" };
  }
  return null;
}

function mapWooProductToFifer(p, idFallback, siteUrl) {
  const id = String(p?.id || idFallback);
  const image = p?.images?.[0]?.src || PLACEHOLDER_IMG;
  const amount = Number(p?.price || p?.regular_price || 0);
  return {
    external_id: id,
    name: String(p?.name || `Woo Product ${id}`),
    price: Number.isFinite(amount) ? amount : 0,
    currency: String(p?.currency || "USD").toUpperCase(),
    stock_status: p?.stock_status === "outofstock" ? "out_of_stock" : "in_stock",
    main_image_url: image,
    source_store: SOURCE,
    commission_rate: null,
    description: String(p?.short_description || p?.description || p?.name || ""),
    product_id: id,
    image_url: image,
    product_url: String(p?.permalink || `${siteUrl}/?p=${id}`),
    affiliate_url: String(p?.permalink || `${siteUrl}/?p=${id}`),
    category: Array.isArray(p?.categories) && p.categories[0]?.name ? String(p.categories[0].name) : "general",
    provider: SOURCE,
    raw: p,
    raw_data: p,
  };
}

function buildMockProduct(productId) {
  const id = String(productId || "1001");
  return mapWooProductToFifer(
    {
      id,
      name: `[MOCK WooCommerce] Product ${id}`,
      price: "17.50",
      currency: "USD",
      stock_status: "instock",
      permalink: `https://example.com/product/${id}`,
      images: [{ src: PLACEHOLDER_IMG }],
      categories: [{ name: "mock" }],
    },
    id,
    "https://example.com"
  );
}

class WooCommerceAdapter extends BaseAffiliateAdapter {
  get providerId() {
    return SOURCE;
  }

  async useMock(options = {}) {
    if (isGhostMode()) {
      warnWooMock("FIFER_GHOST_MODE=true");
      return true;
    }
    const creds = await resolveCredentialsDynamic(options);
    if (!creds) warnWooMock("faltan credenciales WooCommerce");
    return !creds;
  }

  async getProduct(productId, options = {}) {
    const parsed = extractIdOrSlug(productId);
    if (parsed.mode === "invalid" || !parsed.value) throw new Error("woocommerce: id_or_slug requerido");
    if (await this.useMock(options)) return buildMockProduct(parsed.value);

    const creds = await resolveCredentialsDynamic(options);
    if (!creds) return buildMockProduct(parsed.value);
    const siteUrl = normalizeSiteUrl(creds.siteUrl);
    const timeoutMs =
      Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
        ? Number(options.timeoutMs)
        : Number(process.env.WOOCOMMERCE_AXIOS_TIMEOUT_MS || 12000);
    const endpoint =
      parsed.mode === "id"
        ? `${siteUrl}/wp-json/wc/v3/products/${encodeURIComponent(parsed.value)}`
        : `${siteUrl}/wp-json/wc/v3/products?slug=${encodeURIComponent(parsed.value)}&per_page=1`;
    let res;
    try {
      res = await axios.get(endpoint, {
        timeout: timeoutMs,
        validateStatus: () => true,
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret,
        },
      });
    } catch (err) {
      throw new Error(`woocommerce: error de red — ${err?.message || String(err)}`);
    }
    if (res.status === 401 || res.status === 403) {
      return { error: "STORE_AUTH_FAILED", needs_reconnect: true };
    }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`woocommerce: HTTP ${res.status} — ${JSON.stringify(res.data).slice(0, 500)}`);
    }
    const payload =
      parsed.mode === "slug" ? (Array.isArray(res.data) ? res.data[0] : null) : res.data;
    if (!payload || typeof payload !== "object") {
      throw new Error("woocommerce: producto no encontrado por id_or_slug");
    }
    return mapWooProductToFifer(payload, parsed.value, siteUrl);
  }

  async getTopProducts(options = {}) {
    if (await this.useMock(options)) {
      return Array.from({ length: 10 }).map((_, i) => buildMockProduct(String(1001 + i)));
    }
    const creds = await resolveCredentialsDynamic(options);
    if (!creds) {
      return Array.from({ length: 10 }).map((_, i) => buildMockProduct(String(1001 + i)));
    }
    const siteUrl = normalizeSiteUrl(creds.siteUrl);
    const timeoutMs = Number(process.env.WOOCOMMERCE_AXIOS_TIMEOUT_MS || 12000);
    const endpoint = `${siteUrl}/wp-json/wc/v3/products?per_page=10&orderby=date&order=desc`;
    const res = await axios.get(endpoint, {
      timeout: timeoutMs,
      validateStatus: () => true,
      auth: {
        username: creds.consumerKey,
        password: creds.consumerSecret,
      },
    });
    if (res.status === 401 || res.status === 403) {
      return [{ error: "STORE_AUTH_FAILED", needs_reconnect: true }];
    }
    if (res.status < 200 || res.status >= 300 || !Array.isArray(res.data)) {
      throw new Error(`woocommerce: top-products HTTP ${res.status}`);
    }
    return res.data.map((p) => mapWooProductToFifer(p, String(p?.id || ""), siteUrl));
  }

  async checkStockBatch(ids, options = {}) {
    const uniqueIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((i) => String(i).trim()).filter(Boolean)));
    const concurrency = Math.max(1, Number(options.concurrency || 6));
    const out = [];
    for (let i = 0; i < uniqueIds.length; i += concurrency) {
      const chunk = uniqueIds.slice(i, i + concurrency);
      const settled = await Promise.allSettled(
        chunk.map((id) =>
          this.getProduct(id, options).then((p) => ({
            id,
            stock_status:
              p && p.error === "STORE_AUTH_FAILED"
                ? "unknown"
                : p.stock_status === "in_stock" || p.stock_status === "out_of_stock"
                ? p.stock_status
                : "unknown",
            updated_price: p && p.error ? null : Number.isFinite(Number(p.price)) ? Number(p.price) : null,
            currency: p && p.currency ? p.currency : "USD",
          }))
        )
      );
      for (let j = 0; j < settled.length; j++) {
        const s = settled[j];
        if (s.status === "fulfilled") out.push(s.value);
        else out.push({ id: chunk[j], stock_status: "unknown", updated_price: null, currency: "USD" });
      }
    }
    return out;
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

  async getPrice(productId, options = {}) {
    const p = await this.getProduct(productId, options);
    return {
      amount: Number(p.price) || 0,
      currency: p.currency || "USD",
      raw: p.raw,
    };
  }
}

module.exports = {
  WooCommerceAdapter,
  readWooCredentials,
  credentialsReady,
  resolveCredentialsDynamic,
  extractIdOrSlug,
};

