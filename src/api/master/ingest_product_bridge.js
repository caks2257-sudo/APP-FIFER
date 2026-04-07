/**
 * Feeder Node bridge (v2.7): after a successful `public.products` upsert, optionally
 * triggers Master via `src/modules/affiliates/bridge_hook.js` (ISC unificado).
 */
const path = require("path");

const {
  invokeMasterAutomatedPlay,
  resolveMasterAutomatedPlayUrl,
} = require(path.join(__dirname, "../../modules/affiliates/bridge_hook.js"));

function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function resolveMasterPlayUrl() {
  return resolveMasterAutomatedPlayUrl();
}

/**
 * @param {object[]} rows - Rows just upserted successfully
 * @param {{ source?: string }} [context]
 * @returns {Promise<object>}
 */
async function maybeTriggerAutomatedPlayAfterProductsUpsert(rows, context = {}) {
  if (!truthy(process.env.FEATURE_INGEST_MASTER_BRIDGE)) {
    return { skipped: true, reason: "FEATURE_INGEST_MASTER_BRIDGE off" };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { skipped: true, reason: "empty_rows" };
  }

  const out = await invokeMasterAutomatedPlay(rows, {
    source: context.source || "ingest",
  });
  if (!out.ok && !out.skipped) {
    console.error("[MASTER_BRIDGE] ISC failed:", out.error || out.body || out);
  }
  return out;
}

module.exports = {
  maybeTriggerAutomatedPlayAfterProductsUpsert,
  resolveMasterPlayUrl,
};
