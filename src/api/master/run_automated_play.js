/**
 * Master API — automated play entrypoint (v2.7 Infinite Loop).
 * Maps legacy `public.products` upsert rows into the sales/content pipeline.
 */
const { runPipelineWithAsyncPolicy } = require("./pipelines/sales_content_pipeline.js");

function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/**
 * @param {object|object[]} rows - One or more rows in the shape used by ingest upsert
 * @param {object} [extra] - Passed through to the pipeline (max_budget, dry_run, etc.)
 */
function productRowsToPipelineOptions(rows, extra = {}) {
  const list = Array.isArray(rows) ? rows : [rows];
  const row = list.find((r) => r && r.product_id);
  if (!row) return null;

  return {
    product_id: String(row.product_id),
    product_name: row.name || "Product",
    product_url: row.product_url || row.affiliate_url || "",
    async: extra.async !== false,
    forceAsync: truthy(process.env.FIFER_INGEST_PLAY_FORCE_ASYNC) || extra.forceAsync === true,
    estimatedDurationSec: Number(extra.estimatedDurationSec ?? process.env.FIFER_INGEST_PLAY_EST_SEC ?? 30),
    max_budget: extra.max_budget,
    dry_run: extra.dry_run,
    feeder: extra.feeder || "ingest",
    feeder_batch_size: list.length,
    feeder_batch_ids: list.map((r) => r.product_id).filter(Boolean).slice(0, 100),
    ...extra,
  };
}

/**
 * Run the full automated play for ingested product context (async policy by default).
 * @param {object} payload - { rows | products, ...pipelineOverrides }
 */
async function runAutomatedPlay(payload = {}) {
  const { products, rows, ...opts } = payload;
  const sourceRows = rows || products;
  const pipelineOpts = productRowsToPipelineOptions(sourceRows, opts);
  if (!pipelineOpts) {
    return {
      success: false,
      error: "invalid_product_payload",
      message: "Provide rows/products with at least one object containing product_id",
    };
  }

  const result = await runPipelineWithAsyncPolicy(pipelineOpts);
  return result;
}

module.exports = {
  runAutomatedPlay,
  productRowsToPipelineOptions,
  truthy,
};
