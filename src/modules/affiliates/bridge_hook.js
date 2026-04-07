/**
 * Final Bridge (v2.7) — ISC hacia Master automated-play (HTTP o in-process).
 * Los callers de ingest deben usar try/catch o .catch; estas funciones no relanzan errores.
 */
const path = require("path");

const runAutomatedPlayPath = path.join(__dirname, "../../api/master/run_automated_play.js");

/**
 * Convierte producto FIFER v2.8 (adaptador API) a fila compatible con ingest AliExpress + Master pipeline.
 * @param {object} p
 */
function normalizedProductToIngestRow(p) {
  if (!p || typeof p !== "object") {
    return null;
  }
  const id = String(p.external_id ?? p.product_id ?? "").trim();
  if (!id) return null;
  return {
    product_id: id,
    name: p.name || "Product",
    description: p.description || "",
    price: Number(p.price) || 0,
    image_url: p.main_image_url || p.image_url || "",
    product_url: p.product_url || "",
    affiliate_url: p.affiliate_url || p.product_url || "",
    category: p.category || "general",
    source_store: p.source_store || p.provider,
    stock_status: p.stock_status,
  };
}

/**
 * Igual que triggerMasterAfterProductUpsert pero acepta salidas de adaptadores (v2.8) o filas tipo CSV.
 * @param {object[]} items — filas ingest O productos normalizados por adaptador
 * @param {{ source?: string }} [context]
 */
async function triggerMasterFromUniversalProducts(items, context = {}) {
  try {
    const list = Array.isArray(items) ? items : [];
    const rows = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      let row;
      if (item.campaign_id != null) {
        row = { ...item };
      } else if (item.source_store != null || item.external_id != null) {
        row = normalizedProductToIngestRow(item);
      } else if (item.product_id != null) {
        row = { ...item };
      } else {
        row = normalizedProductToIngestRow(item);
      }
      if (row && String(row.product_id || "").trim()) {
        rows.push(row);
      }
    }
    if (rows.length === 0) {
      return { ok: false, skipped: true, reason: "no_valid_rows" };
    }
    return await invokeMasterAutomatedPlay(rows, {
      source: context.source || "universal_connector",
    });
  } catch (err) {
    console.error("[BRIDGE_HOOK] triggerMasterFromUniversalProducts:", err.message || String(err));
    return { ok: false, error: err.message || String(err) };
  }
}

function resolveMasterAutomatedPlayUrl() {
  const base = String(
    process.env.MASTER_API_BASE_URL || process.env.FIFER_MASTER_API_URL || ""
  ).trim();
  if (!base) return "";
  return `${base.replace(/\/$/, "")}/api/v1/master/automated-play`;
}

/**
 * Llamada ISC al orquestador (POST automated-play o runAutomatedPlay local).
 * @param {object[]} rows - Filas shape ingest (al menos product_id)
 * @param {{ source?: string }} [context]
 * @returns {Promise<{ ok: boolean, skipped?: boolean, mode?: string, error?: string, body?: object, result?: object }>}
 */
async function invokeMasterAutomatedPlay(rows, context = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, skipped: true, reason: "empty_rows" };
  }

  const url = resolveMasterAutomatedPlayUrl();
  const internalKey = String(process.env.FIFER_INTERNAL_KEY || "").trim();

  if (url && internalKey) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FIFER-INTERNAL-KEY": internalKey,
        },
        body: JSON.stringify({
          rows,
          source: context.source || "bridge_hook",
        }),
      });
      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = { raw: text };
      }
      if (!res.ok) {
        return {
          ok: false,
          mode: "http",
          status: res.status,
          body,
          error: body?.error || `HTTP ${res.status}`,
        };
      }
      return { ok: Boolean(body?.success !== false && res.ok), mode: "http", status: res.status, body };
    } catch (err) {
      return {
        ok: false,
        mode: "http",
        error: err.message || String(err),
      };
    }
  }

  if (url && !internalKey) {
    console.warn(
      "[BRIDGE_HOOK] MASTER_API_BASE_URL definido pero falta FIFER_INTERNAL_KEY — usando in-process."
    );
  }

  try {
    const { runAutomatedPlay } = require(runAutomatedPlayPath);
    const result = await runAutomatedPlay({
      rows,
      source: context.source || "bridge_hook",
    });
    return { ok: Boolean(result?.success), mode: "in_process", result };
  } catch (err) {
    console.error("[BRIDGE_HOOK] in-process:", err.message || String(err));
    return { ok: false, mode: "in_process", error: err.message || String(err) };
  }
}

/**
 * Dispara el pipeline Master para un único product_id (ISC).
 * @param {string} productId
 * @param {{ row?: object, name?: string, product_url?: string, affiliate_url?: string, source?: string }} [options]
 */
async function triggerMasterProcessing(productId, options = {}) {
  try {
    const id = String(productId == null ? "" : productId).trim();
    if (!id) {
      return { ok: false, skipped: true, reason: "empty_product_id" };
    }
    const row =
      options.row && typeof options.row === "object"
        ? options.row
        : {
            product_id: id,
            name: options.name || "Product",
            product_url: options.product_url || "",
            affiliate_url: options.affiliate_url || "",
          };
    return await invokeMasterAutomatedPlay([row], {
      source: options.source || "affiliates_bridge",
    });
  } catch (err) {
    console.error("[BRIDGE_HOOK] triggerMasterProcessing:", err.message || String(err));
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * Un único ISC tras upsert exitoso de un lote (recomendado para sync AliExpress).
 * @param {object[]} rows
 * @param {{ source?: string }} [context]
 */
async function triggerMasterAfterProductUpsert(rows, context = {}) {
  try {
    return await invokeMasterAutomatedPlay(rows, context);
  } catch (err) {
    console.error("[BRIDGE_HOOK] triggerMasterAfterProductUpsert:", err.message || String(err));
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * X-Ray / boot: comprueba si el auto-process puede alcanzar al Master cuando está configurado por HTTP.
 */
async function probeMasterBridgeReadiness() {
  if (process.env.FEATURE_AUTO_PROCESS !== "true") {
    return { skipped: true, detail: "FEATURE_AUTO_PROCESS no activo" };
  }

  const key = String(process.env.FIFER_INTERNAL_KEY || "").trim();
  if (!key) {
    return {
      skipped: false,
      ok: false,
      detail:
        "FIFER_INTERNAL_KEY ausente — las llamadas ISC al Master fallarán hasta configurarla",
    };
  }

  const base = String(
    process.env.MASTER_API_BASE_URL || process.env.FIFER_MASTER_API_URL || ""
  ).trim();

  if (!base) {
    return {
      skipped: false,
      ok: true,
      detail: "modo in-process (sin MASTER_API_BASE_URL)",
    };
  }

  const healthUrl = `${base.replace(/\/$/, "")}/healthz`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(healthUrl, { method: "GET", signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        skipped: false,
        ok: false,
        detail: `healthz respondió ${res.status} (${healthUrl})`,
      };
    }
    return {
      skipped: false,
      ok: true,
      detail: `Master API alcanzable (${healthUrl})`,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      skipped: false,
      ok: false,
      detail: err.message || String(err),
    };
  }
}

module.exports = {
  invokeMasterAutomatedPlay,
  triggerMasterProcessing,
  triggerMasterAfterProductUpsert,
  triggerMasterFromUniversalProducts,
  normalizedProductToIngestRow,
  probeMasterBridgeReadiness,
  resolveMasterAutomatedPlayUrl,
};
