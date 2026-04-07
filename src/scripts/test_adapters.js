#!/usr/bin/env node
/**
 * Sonda de diagnóstico — adaptadores multi-tienda (Shopify, AliExpress, …).
 *
 * Uso Shopify (API real, sin mock):
 *   node src/scripts/test_adapters.js
 *   node src/scripts/test_adapters.js --adapter=shopify --product-id=123456789
 *   SHOPIFY_TEST_PRODUCT_ID=123 node src/scripts/test_adapters.js
 *
 * Uso AliExpress (API real aliexpress.affiliate.productdetail.get + firma MD5):
 *   node src/scripts/test_adapters.js --adapter=aliexpress --url="https://es.aliexpress.com/item/1005001234567890.html"
 *   node src/scripts/test_adapters.js --adapter=aliexpress --url=1005001234567890 --xray=true
 *
 * Uso Mercado Libre (/items/{id}):
 *   node src/scripts/test_adapters.js --adapter=mercadolibre --url=MLA123456789
 *   node src/scripts/test_adapters.js --adapter=mercadolibre --url="https://articulo.mercadolibre.com.ar/MLA-123456789-demo"
 *
 * Requiere .env: AliExpress → ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET (y opc. ALIEXPRESS_ACCESS_TOKEN).
 */
const path = require("path");
const fs = require("fs");

const REPO_ROOT = path.join(__dirname, "..", "..");
const ENV_MAIN = path.join(REPO_ROOT, ".env");
const ENV_LOCAL = path.join(REPO_ROOT, ".env.local");

require("dotenv").config({ path: ENV_MAIN });
if (fs.existsSync(ENV_LOCAL)) {
  require("dotenv").config({ path: ENV_LOCAL, override: true });
}

function parseCli() {
  const raw = process.argv.slice(2);
  let adapter = "shopify";
  let url = "";
  let productId = "";
  let xray = false;
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a.startsWith("--adapter=")) {
      adapter = (a.split("=")[1] || "").trim().toLowerCase() || "shopify";
    } else if (a === "--adapter" && raw[i + 1]) {
      adapter = String(raw[i + 1]).trim().toLowerCase();
      i++;
    } else if (a.startsWith("--url=")) {
      url = a.slice("--url=".length).replace(/^["']|["']$/g, "").trim();
    } else if (a === "--url" && raw[i + 1]) {
      url = String(raw[i + 1]).replace(/^["']|["']$/g, "").trim();
      i++;
    } else if (a.startsWith("--product-id=")) {
      productId = (a.split("=")[1] || "").trim();
    } else if (a === "--product-id" && raw[i + 1]) {
      productId = String(raw[i + 1]).trim();
      i++;
    } else if (a.startsWith("--xray=")) {
      const v = (a.split("=")[1] || "").trim().toLowerCase();
      xray = v === "true" || v === "1" || v === "yes";
    } else if (a === "--xray" || a === "--xray=true") {
      xray = true;
    }
  }
  if (!url && process.env.ALIEXPRESS_TEST_URL) {
    url = String(process.env.ALIEXPRESS_TEST_URL).trim();
  }
  if (!productId && process.env.SHOPIFY_TEST_PRODUCT_ID) {
    productId = String(process.env.SHOPIFY_TEST_PRODUCT_ID).trim();
  }
  return { adapter, url, productId, xray };
}

// Forzar prueba Shopify contra API real (el adaptador lee esto al cargarse)
process.env.FEATURE_SHOPIFY_MOCK = "false";
process.env.SHOPIFY_MOCK_DELAY_MS = "0";

const {
  ShopifyAdapter,
  shopifyCredentialsReady,
  resolveStoreHost,
  resolveAccessToken,
} = require(path.join(__dirname, "../modules/affiliates/adapters/shopify_adapter.js"));

const { AliExpressAdapter } = require(path.join(
  __dirname,
  "../modules/affiliates/adapters/aliexpress_adapter.js"
));
const { MercadoLibreAdapter } = require(path.join(
  __dirname,
  "../modules/affiliates/adapters/meli_adapter.js"
));

function apiVersion() {
  return String(process.env.SHOPIFY_API_VERSION || "2024-01").trim();
}

async function fetchProductIds(limit = 2) {
  const host = resolveStoreHost();
  const token = resolveAccessToken();
  const url = `https://${host}/admin/api/${apiVersion()}/products.json?limit=${limit}&fields=id,title`;

  const t0 = Date.now();
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Shopify-Access-Token": token,
    },
  });
  const latencyMs = Date.now() - t0;
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { _parseError: true, snippet: text?.slice(0, 400) };
  }

  if (!res.ok) {
    const err = new Error(
      `Listado products.json → HTTP ${res.status}: ${JSON.stringify(body?.errors || body).slice(0, 300)}`
    );
    err.latencyMs = latencyMs;
    err.body = body;
    throw err;
  }

  const products = body?.products || [];
  const ids = products.map((p) => String(p.id)).filter(Boolean);
  return { ids, latencyMs, rawCount: products.length };
}

function printHeader(title) {
  const line = "═".repeat(Math.min(56, title.length + 8));
  console.log(`\n${line}\n  ${title}\n${line}`);
}

/** Mismo subconjunto que Shopify — valida paridad de esquema FIFER normalizado. */
function printFiferSchema(obj, options = {}) {
  const omitRaw = options.omitRaw === true;
  const subset = {
    external_id: obj.external_id,
    name: obj.name,
    price: obj.price,
    currency: obj.currency,
    stock_status: obj.stock_status,
    main_image_url: obj.main_image_url,
    source_store: obj.source_store,
    description:
      (obj.description && obj.description.slice(0, 120) + (obj.description.length > 120 ? "…" : "")) ||
      "",
    product_url: obj.product_url,
    category: obj.category,
    provider: obj.provider,
  };
  if (!omitRaw) subset.raw = obj.raw;
  console.log(JSON.stringify(subset, null, 2));
}

async function probeGetProduct(adapter, productId) {
  const t0 = Date.now();
  let normalized;
  let error;
  try {
    normalized = await adapter.getProduct(productId);
  } catch (e) {
    error = e;
  }
  const latencyMs = Date.now() - t0;
  return { normalized, error, latencyMs };
}

async function runShopifyProbe(cli) {
  printHeader("FIFER — Sonda Shopify (Universal Adapter)");

  if (!shopifyCredentialsReady()) {
    console.log("\n❌ Fallo — Credenciales incompletas.");
    console.log(
      "   Define SHOPIFY_STORE_URL (o SHOPIFY_STORE_DOMAIN) y SHOPIFY_API_KEY (o SHOPIFY_ADMIN_ACCESS_TOKEN) en .env"
    );
    process.exit(1);
  }

  console.log("\n📡 Modo: API real (FEATURE_SHOPIFY_MOCK forzado a false para esta ejecución)");
  console.log(`   Tienda: ${resolveStoreHost()}`);
  console.log(`   API: ${apiVersion()}`);

  const adapter = new ShopifyAdapter();
  if (adapter.useMock()) {
    console.log("\n❌ Fallo — El adaptador seguiría en mock (credenciales no detectadas tras carga).");
    process.exit(1);
  }

  const explicitId = cli.productId;
  let idsToProbe = [];

  if (explicitId) {
    idsToProbe = [explicitId];
    console.log(`\n🔎 Producto explícito: ${explicitId}`);
  } else {
    console.log("\n🔎 Obteniendo hasta 2 IDs vía GET .../products.json?limit=2 …");
    try {
      const { ids, latencyMs, rawCount } = await fetchProductIds(2);
      console.log(`   ✅ Listado OK — ${rawCount} producto(s) vistos — latencia ${latencyMs} ms`);
      idsToProbe = ids.slice(0, 2);
      if (idsToProbe.length === 0) {
        console.log("\n⚠️  La tienda no devolvió productos. Usa --product-id=ID o SHOPIFY_TEST_PRODUCT_ID.");
        process.exit(2);
      }
      console.log(`   IDs a normalizar: ${idsToProbe.join(", ")}`);
    } catch (e) {
      console.log(`\n❌ Fallo — Listado: ${e.message}`);
      if (e.latencyMs != null) console.log(`   Latencia listado: ${e.latencyMs} ms`);
      process.exit(1);
    }
  }

  let anyOk = false;
  for (const id of idsToProbe) {
    printHeader(`Normalizado FIFER — product_id ${id}`);
    const { normalized, error, latencyMs } = await probeGetProduct(adapter, id);
    if (error) {
      console.log(`\n❌ Fallo — getProduct: ${error.message}`);
      console.log(`   Latencia: ${latencyMs} ms`);
      continue;
    }
    console.log(`\n✅ Éxito — conexión y normalización`);
    console.log(`   Latencia getProduct: ${latencyMs} ms\n`);
    printFiferSchema(normalized);
    anyOk = true;
  }

  printHeader("Resumen");
  console.log(anyOk ? "\n✅ Al menos una sonda completó con éxito.\n" : "\n❌ Ninguna sonda completó con éxito.\n");
  process.exit(anyOk ? 0 : 1);
}

async function runAliExpressProbe(cli) {
  printHeader("FIFER — Sonda AliExpress (API afiliados + firma MD5)");

  const target = (cli.url || "").trim();
  if (!target) {
    console.log("\n❌ Falta --url con la URL de producto AliExpress o el ID numérico.");
    console.log(
      '   Ejemplo: node src/scripts/test_adapters.js --adapter=aliexpress --url="https://es.aliexpress.com/item/1005001234567890.html"'
    );
    process.exit(1);
  }

  console.log("\n📡 Modo: POST https://api-sg.aliexpress.com/rest (override: ALIEXPRESS_API_URL)");
  console.log(`   Entrada: ${target}`);
  console.log(`   Rayos X crudo: ${cli.xray ? "sí (--xray=true)" : "no (añade --xray=true para JSON completo de la API)"}`);

  const adapter = new AliExpressAdapter();
  printHeader("Normalizado FIFER — AliExpress");
  const { normalized, error, latencyMs } = await probeGetProduct(adapter, target);
  if (error) {
    console.log(`\n❌ Fallo — getProduct: ${error.message}`);
    console.log(`   Latencia: ${latencyMs} ms`);
    printHeader("Resumen");
    console.log("\n❌ Sonda AliExpress falló.\n");
    process.exit(1);
  }

  console.log(`\n✅ Éxito — API AliExpress + normalización`);
  console.log(`   Latencia getProduct: ${latencyMs} ms\n`);
  printFiferSchema(normalized, { omitRaw: true });

  if (cli.xray && normalized.raw != null) {
    console.log("\n🩻 RAYOS X: PAYLOAD CRUDO ALIEXPRESS\n");
    console.log(JSON.stringify(normalized.raw, null, 2));
  }

  printHeader("Resumen");
  console.log("\n✅ Sonda AliExpress completada (subconjunto FIFER alineado a Shopify; raw completo solo con --xray).\n");
  process.exit(0);
}

async function runMercadoLibreProbe(cli) {
  printHeader("FIFER — Sonda Mercado Libre (/items/{id})");

  const target = (cli.url || cli.productId || "").trim();
  if (!target) {
    console.log("\n❌ Falta --url o --product-id con un ID Mercado Libre (ej. MLA123456789).");
    console.log(
      '   Ejemplo: node src/scripts/test_adapters.js --adapter=mercadolibre --url="MLA123456789"'
    );
    process.exit(1);
  }

  console.log("\n📡 Modo: GET https://api.mercadolibre.com/items/{id} (override: MERCADOLIBRE_API_URL)");
  console.log(`   Entrada: ${target}`);

  const adapter = new MercadoLibreAdapter();
  printHeader("Normalizado FIFER — Mercado Libre");
  const { normalized, error, latencyMs } = await probeGetProduct(adapter, target);
  if (error) {
    console.log(`\n❌ Fallo — getProduct: ${error.message}`);
    console.log(`   Latencia: ${latencyMs} ms`);
    printHeader("Resumen");
    console.log("\n❌ Sonda Mercado Libre falló.\n");
    process.exit(1);
  }

  console.log(`\n✅ Éxito — API Mercado Libre + normalización`);
  console.log(`   Latencia getProduct: ${latencyMs} ms\n`);
  printFiferSchema(normalized, { omitRaw: true });

  printHeader("Resumen");
  console.log("\n✅ Sonda Mercado Libre completada (subconjunto FIFER alineado).\n");
  process.exit(0);
}

async function main() {
  const cli = parseCli();
  if (cli.adapter === "aliexpress") {
    await runAliExpressProbe(cli);
    return;
  }
  if (cli.adapter === "mercadolibre" || cli.adapter === "meli") {
    await runMercadoLibreProbe(cli);
    return;
  }
  if (cli.adapter === "shopify" || !cli.adapter) {
    await runShopifyProbe(cli);
    return;
  }
  console.error(`\n❌ Adaptador desconocido: ${cli.adapter}. Usa shopify, aliexpress o mercadolibre.\n`);
  process.exit(2);
}

main().catch((err) => {
  console.error("\n❌ Error no controlado:", err?.message || err);
  process.exit(1);
});
