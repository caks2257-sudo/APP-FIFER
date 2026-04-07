const crypto = require("crypto");
const axios = require("axios");
const { BaseAffiliateAdapter } = require("./base_adapter.js");
const { convertToUSD } = require("../../../services/currency_service.js");

const SOURCE = "amazon";
const PLACEHOLDER_IMG =
  "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";

function isGhostMode() {
  return String(process.env.FIFER_GHOST_MODE || "").trim().toLowerCase() === "true";
}

function readAmazonCredentials() {
  return {
    accessKey: String(process.env.AWS_ACCESS_KEY || process.env.AMAZON_AWS_ACCESS_KEY || "").trim(),
    secretKey: String(process.env.AWS_SECRET_KEY || process.env.AMAZON_AWS_SECRET_KEY || "").trim(),
    partnerTag: String(process.env.AMAZON_PARTNER_TAG || "").trim(),
    host: String(process.env.AMAZON_PAAPI_HOST || "webservices.amazon.com").trim(),
    region: String(process.env.AMAZON_PAAPI_REGION || "us-east-1").trim(),
  };
}

function credentialsReady() {
  const c = readAmazonCredentials();
  return Boolean(c.accessKey && c.secretKey && c.partnerTag);
}

let amazonWarnedMock = false;
function warnAmazonMock(reason) {
  if (amazonWarnedMock) return;
  amazonWarnedMock = true;
  console.warn(`[amazon_adapter] WARN: ${reason}. Activando Mock Mode.`);
}

function extractAsin(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (/^[A-Z0-9]{10}$/i.test(raw)) return raw.toUpperCase();
  try {
    const u = new URL(raw);
    const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (m) return m[1].toUpperCase();
  } catch {
    // ignore
  }
  const m = raw.match(/([A-Z0-9]{10})/i);
  return m ? m[1].toUpperCase() : "";
}

function mapAmazonToFifer(asin, item, fullRaw) {
  const title =
    item?.ItemInfo?.Title?.DisplayValue ||
    item?.title ||
    `Amazon Product ${asin}`;
  const amount =
    Number(item?.Offers?.Listings?.[0]?.Price?.Amount) ||
    Number(item?.price) ||
    0;
  const currency =
    String(item?.Offers?.Listings?.[0]?.Price?.Currency || item?.currency || "USD").toUpperCase();
  const image =
    item?.Images?.Primary?.Large?.URL ||
    item?.image_url ||
    PLACEHOLDER_IMG;
  const detail =
    item?.DetailPageURL ||
    item?.affiliate_url ||
    `https://www.amazon.com/dp/${asin}`;

  return {
    external_id: asin,
    name: String(title),
    price: Number.isFinite(amount) ? amount : 0,
    price_usd: null,
    currency,
    stock_status: "in_stock",
    main_image_url: image,
    source_store: SOURCE,
    commission_rate: null,
    description: String(title),
    product_id: asin,
    image_url: image,
    product_url: detail,
    affiliate_url: detail,
    category: "general",
    provider: SOURCE,
    raw: fullRaw,
    raw_data: fullRaw,
  };
}

function buildMockProduct(asin) {
  return mapAmazonToFifer(
    asin,
    {
      title: `[MOCK Amazon] Product ${asin}`,
      price: 24.9,
      currency: "USD",
      image_url: PLACEHOLDER_IMG,
      affiliate_url: `https://www.amazon.com/dp/${asin}?tag=mock-20`,
    },
    { mock: true, provider: SOURCE }
  );
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key, value, encoding = undefined) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function buildPaapiSigV4Headers(payload, creds) {
  const host = creds.host;
  const region = creds.region;
  const service = "ProductAdvertisingAPI";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalUri = "/paapi5/getitems";
  const canonicalQuerystring = "";
  const contentType = "application/json; charset=utf-8";
  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems";
  const payloadHash = sha256Hex(payload);
  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = [
    "POST",
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${creds.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign, "hex");
  const authorization =
    `${algorithm} ` +
    `Credential=${creds.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    "Content-Encoding": "amz-1.0",
    "Content-Type": contentType,
    "X-Amz-Target": target,
    "X-Amz-Date": amzDate,
    Authorization: authorization,
    Host: host,
  };
}

class AmazonAdapter extends BaseAffiliateAdapter {
  get providerId() {
    return SOURCE;
  }

  useMock() {
    if (isGhostMode()) {
      warnAmazonMock("FIFER_GHOST_MODE=true");
      return true;
    }
    if (!credentialsReady()) {
      warnAmazonMock("faltan credenciales AWS_ACCESS_KEY/AWS_SECRET_KEY/AMAZON_PARTNER_TAG");
      return true;
    }
    return false;
  }

  async getProduct(asinOrUrl, options = {}) {
    const asin = extractAsin(asinOrUrl);
    if (!asin) throw new Error("amazon: ASIN inválido (usa ASIN o URL /dp/ASIN)");
    if (this.useMock()) {
      const mock = buildMockProduct(asin);
      const converted = await convertToUSD(mock.price, mock.currency);
      return { ...mock, price_usd: converted.amount_usd };
    }

    const creds = readAmazonCredentials();
    const endpoint = `https://${creds.host}/paapi5/getitems`;
    const payload = {
      PartnerTag: creds.partnerTag,
      PartnerType: "Associates",
      Marketplace: "www.amazon.com",
      ItemIds: [asin],
      Resources: [
        "ItemInfo.Title",
        "Images.Primary.Large",
        "Offers.Listings.Price",
      ],
    };

    const payloadStr = JSON.stringify(payload);
    const signedHeaders = buildPaapiSigV4Headers(payloadStr, creds);
    const timeoutMs =
      Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
        ? Number(options.timeoutMs)
        : Number(process.env.AMAZON_AXIOS_TIMEOUT_MS || 12000);

    let res;
    try {
      res = await axios.post(endpoint, payloadStr, {
        timeout: timeoutMs,
        validateStatus: () => true,
        headers: signedHeaders,
      });
    } catch (err) {
      throw new Error(`amazon: error de red — ${err?.message || String(err)}`);
    }

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`amazon: HTTP ${res.status} — ${JSON.stringify(res.data).slice(0, 500)}`);
    }

    const item = res?.data?.ItemsResult?.Items?.[0];
    if (!item) throw new Error("amazon: respuesta sin ItemsResult.Items[0]");
    const normalized = mapAmazonToFifer(asin, item, res.data);
    const converted = await convertToUSD(normalized.price, normalized.currency);
    return { ...normalized, price_usd: converted.amount_usd };
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
  AmazonAdapter,
  extractAsin,
  readAmazonCredentials,
  credentialsReady,
};

