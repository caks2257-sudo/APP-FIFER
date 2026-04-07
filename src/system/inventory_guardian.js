const cron = require("node-cron");
const { MercadoLibreAdapter } = require("../modules/affiliates/adapters/meli_adapter.js");
const { AliExpressAdapter } = require("../modules/affiliates/adapters/aliexpress_adapter.js");
const {
  getServiceClient,
  markDraftAsStatus,
  getAdMappingByDraftId,
} = require("../modules/fifer-platform/campaigns/draftRepository.js");
const { notifyMakeInventoryChange, notifyMakeToPause } = require("../services/publish_service.js");

let guardianTask = null;

/**
 * @param {object} draft
 * @returns {{ store: string|null, productId: string|null }}
 */
function resolveDraftStoreAndProductId(draft) {
  const meta = draft?.metadata && typeof draft.metadata === "object" ? draft.metadata : {};
  const raw = meta.raw_product_snapshot && typeof meta.raw_product_snapshot === "object" ? meta.raw_product_snapshot : {};

  const store = String(
    raw.source_store || raw.provider || raw.source || meta.source_store || ""
  )
    .trim()
    .toLowerCase();

  const productId = String(
    raw.external_id || raw.product_id || raw.item_id || raw.id || draft?.source_url || ""
  ).trim();

  if (!store || !productId) return { store: null, productId: null };
  return { store: store === "meli" ? "mercadolibre" : store, productId };
}

async function getDraftsByStatus(status) {
  const client = getServiceClient();
  if (!client) {
    throw new Error("Inventory Guardian requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  }
  const { data, error } = await client
    .schema("fifer_platform")
    .from("campaign_drafts")
    .select("id,status,source_url,metadata")
    .eq("status", String(status || "").trim());
  if (error) {
    throw new Error(error.message || String(error));
  }
  return Array.isArray(data) ? data : [];
}

function createGroupedBuckets() {
  return {
    mercadolibre: { adapter: new MercadoLibreAdapter(), map: new Map() },
    aliexpress: { adapter: new AliExpressAdapter(), map: new Map() },
  };
}

function populateGroupedDrafts(drafts, grouped, audit, skippedStatus = "skipped_unknown_store") {
  for (const draft of drafts) {
    const r = resolveDraftStoreAndProductId(draft);
    if (!r.store || !r.productId || !grouped[r.store]) {
      audit.push({
        draft_id: draft.id,
        level: "warn",
        status: skippedStatus,
        detail: "No se pudo resolver tienda/product_id desde metadata",
      });
      continue;
    }
    const arr = grouped[r.store].map.get(r.productId) || [];
    arr.push(draft);
    grouped[r.store].map.set(r.productId, arr);
  }
}

async function runInventoryGuardianCycle() {
  const audit = [];
  try {
    const drafts = await getDraftsByStatus("published");
    const pausedDrafts = await getDraftsByStatus("paused_by_inventory");
    const grouped = createGroupedBuckets();
    const groupedPaused = createGroupedBuckets();

    populateGroupedDrafts(drafts, grouped, audit, "scan_published_skipped_unknown_store");
    populateGroupedDrafts(pausedDrafts, groupedPaused, audit, "scan_paused_skipped_unknown_store");

    let pausedCount = 0;
    let resumedCount = 0;

    // FASE 1: campañas publicadas -> pausar si out_of_stock.
    for (const [store, bucket] of Object.entries(grouped)) {
      const ids = Array.from(bucket.map.keys());
      if (ids.length === 0) continue;

      let stockRows = [];
      try {
        stockRows = await bucket.adapter.checkStockBatch(ids, { concurrency: 8, timeoutMs: 2500 });
      } catch (err) {
        audit.push({
          store,
          level: "error",
          status: "provider_batch_failed",
          detail: err?.message || String(err),
        });
        // Autosanación: no pausar en fallo API.
        continue;
      }

      for (const row of stockRows) {
        const itemId = String(row?.id || "");
        const draftsForItem = bucket.map.get(itemId) || [];
        for (const draft of draftsForItem) {
          const draftId = String(draft?.id || "");
          if (!draftId) continue;
          const stock = row?.stock_status;
          if (stock !== "out_of_stock") {
            audit.push({
              draft_id: draftId,
              store,
              status: "ok",
              stock_status: stock || "unknown",
            });
            continue;
          }

          const mapping = await getAdMappingByDraftId(draftId);
          const platformAdId = mapping?.platform_ad_id ? String(mapping.platform_ad_id) : null;
          const notify = await notifyMakeToPause(draftId, {
            reason: "out_of_stock",
            source_store: store,
            product_id: itemId,
            platform_ad_id: platformAdId,
          });
          if (!notify.success) {
            audit.push({
              draft_id: draftId,
              store,
              level: "error",
              status: "make_pause_notify_failed",
              detail: notify.error || notify.reason || "make_inventory_dispatch_failed",
            });
            // No cambiar estado si falla notificación externa.
            continue;
          }

          const marked = await markDraftAsStatus(draftId, "paused_by_inventory");
          if (!marked.ok) {
            audit.push({
              draft_id: draftId,
              store,
              level: "error",
              status: "pause_status_update_failed",
              detail: marked.error || "unknown",
            });
            continue;
          }

          pausedCount += 1;
          audit.push({
            draft_id: draftId,
            store,
            status: "paused_by_inventory",
            stock_status: "out_of_stock",
          });
        }
      }
    }

    // FASE 2 (Resurrection): campañas paused_by_inventory -> published si stock restaurado.
    for (const [store, bucket] of Object.entries(groupedPaused)) {
      const ids = Array.from(bucket.map.keys());
      if (ids.length === 0) continue;

      let stockRows = [];
      try {
        stockRows = await bucket.adapter.checkStockBatch(ids, { concurrency: 8, timeoutMs: 2500 });
      } catch (err) {
        audit.push({
          store,
          level: "error",
          status: "provider_batch_failed_paused_scan",
          detail: err?.message || String(err),
        });
        // Autosanación: no reactivar si la API falla.
        continue;
      }

      for (const row of stockRows) {
        const itemId = String(row?.id || "");
        const draftsForItem = bucket.map.get(itemId) || [];
        for (const draft of draftsForItem) {
          const draftId = String(draft?.id || "");
          if (!draftId) continue;
          const stock = row?.stock_status;
          if (stock !== "in_stock") {
            audit.push({
              draft_id: draftId,
              store,
              status: "paused_pending_stock_restore",
              stock_status: stock || "unknown",
            });
            continue;
          }

          const notifyOk = await notifyMakeInventoryChange(draft, "RESUME_CAMPAIGN_STOCK_RESTORED");
          if (!notifyOk) {
            audit.push({
              draft_id: draftId,
              store,
              level: "error",
              status: "make_resume_notify_failed",
              detail: "make_inventory_dispatch_failed",
            });
            // Regla autosanación: sin acuse de Make no se toca DB.
            continue;
          }

          const marked = await markDraftAsStatus(draftId, "published");
          if (!marked.ok) {
            audit.push({
              draft_id: draftId,
              store,
              level: "error",
              status: "resume_status_update_failed",
              detail: marked.error || "unknown",
            });
            continue;
          }

          resumedCount += 1;
          console.log(`🚀 Campaña ${draftId} reactivada: Stock restaurado`);
          audit.push({
            draft_id: draftId,
            store,
            status: "resumed_to_published",
            stock_status: "in_stock",
          });
        }
      }
    }

    const errors = audit.filter((a) => a.level === "error").length;
    console.log(
      `🛡️ Inventory Guardian: published ${drafts.length}, paused_scan ${pausedDrafts.length}, pausadas ${pausedCount}, reactivadas ${resumedCount}, audit_errors ${errors}`
    );
    if (errors > 0) {
      console.warn("🧾 Inventory Audit:", JSON.stringify(audit.slice(0, 30)));
    }
    return {
      ok: true,
      reviewed: drafts.length + pausedDrafts.length,
      paused: pausedCount,
      resumed: resumedCount,
      audit,
    };
  } catch (err) {
    console.error("🛡️ Inventory Guardian: ciclo falló:", err?.message || String(err));
    return { ok: false, reviewed: 0, paused: 0, resumed: 0, audit, error: err?.message || String(err) };
  }
}

function startInventoryGuardian() {
  if (guardianTask) return guardianTask;
  guardianTask = cron.schedule("0 3 * * *", async () => {
    await runInventoryGuardianCycle();
  });
  console.log("🛡️ Inventory Guardian: scheduler iniciado (03:00 AM diario)");
  return guardianTask;
}

module.exports = {
  startInventoryGuardian,
  runInventoryGuardianCycle,
  resolveDraftStoreAndProductId,
};

