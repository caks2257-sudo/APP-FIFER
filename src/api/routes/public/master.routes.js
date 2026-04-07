/**
 * Master Public Gateway (v2.9 Security Fortress)
 * - POST /automated-play → X-FIFER-INTERNAL-KEY (bot / ISC; sin JWT)
 * - POST /orchestrate → requireAuth
 * - POST /url-campaign → requireAuth (Web Ingestion Node v3.0)
 * - POST /publish-draft → requireAuth (publicar borrador → Make, v3.3)
 *
 * Cualquier ruta GET/POST futura de orquestación orientada a usuarios debe usar `requireAuth`.
 * Montaje: `express.Router()` + `attachPublicMasterRoutes(router)`.
 */
const path = require("path");
const { requireAuth } = require(path.join(__dirname, "../../middlewares/auth_supabase.js"));
const { internalAuth } = require(path.join(__dirname, "../../middlewares/internal_auth.js"));
const { runAutomatedPlay } = require(path.join(__dirname, "../../master/run_automated_play.js"));
const { MasterOrchestrator } = require(path.join(__dirname, "../../master/master_orchestrator.js"));
const { successResponse, errorResponse } = require(path.join(__dirname, "../../../utils/response_builder.js"));
const { runUrlCampaignPipeline } = require(path.join(__dirname, "../../master/pipelines/url_campaign_pipeline.js"));
const { getActiveEngines } = require(path.join(__dirname, "../../../config/ai_engines.js"));
const {
  getDraftById,
  markDraftAsStatus,
  upsertAdMapping,
  setDraftPlatformAdId,
} = require(path.join(__dirname, "../../../modules/fifer-platform/campaigns/draftRepository.js"));
const {
  dispatchMakeWebhook,
  buildMakeDispatchPayloadFromDraft,
} = require(path.join(__dirname, "../../../services/publish_service.js"));
const { getEarningsSummary } = require(path.join(
  __dirname,
  "../../../modules/fifer-platform/finance-bridge/finance_client.js"
));
const { MercadoLibreAdapter } = require(path.join(
  __dirname,
  "../../../modules/affiliates/adapters/meli_adapter.js"
));
const { AliExpressAdapter } = require(path.join(
  __dirname,
  "../../../modules/affiliates/adapters/aliexpress_adapter.js"
));
const { WooCommerceAdapter } = require(path.join(
  __dirname,
  "../../../modules/affiliates/adapters/woocommerce_adapter.js"
));
const {
  listUserApiKeys,
  upsertUserApiKey,
  testProviderKey,
  deleteUserApiKey,
} = require(path.join(__dirname, "../../../modules/fifer-platform/auth/byokVault.js"));

/** @type {Map<string, { stock_status: "in_stock" | "out_of_stock" | "unknown", updated_price: number | null, store: string, at: string }>} */
const STOCK_SYNC_CACHE = new Map();

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), timeoutMs);
    }),
  ]);
}

function normalizeStore(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "meli" || s === "mercado_libre") return "mercadolibre";
  return s;
}

function isUuid(value) {
  const v = String(value || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function allowInternalOrAuth(req, res, next) {
  const incoming = String(req.headers["x-fifer-internal-key"] || "").trim();
  const expected = String(process.env.FIFER_INTERNAL_KEY || "").trim();
  if (incoming && expected && incoming === expected) {
    req.internalAuth = true;
    return next();
  }
  return requireAuth(req, res, next);
}

function injectUserMetadata(result, userId) {
  if (!result || typeof result !== "object") return result;
  const meta = result.metadata && typeof result.metadata === "object" ? { ...result.metadata } : {};
  if (userId) meta.user_id = userId;
  return { ...result, metadata: meta };
}

/**
 * @param {import("express").Router} router
 */
function attachPublicMasterRoutes(router) {
  router.post("/automated-play", internalAuth, async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const result = await runAutomatedPlay(body);
      const httpStatus = result.success ? 200 : 502;
      return res.status(httpStatus).json(result);
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err?.message || String(err),
        data: null,
        metadata: { node: "master_automated_play" },
      });
    }
  });

  router.post("/orchestrate", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { action, payload = {} } = body;

      const nodeKey =
        (typeof payload.node === "string" && payload.node) ||
        (typeof action === "string" && action) ||
        "";

      if (!nodeKey) {
        return res.status(400).json(
          errorResponse("orchestrate requiere `action` o `payload.node`", {
            node: "master_orchestrate_gateway",
            code: "invalid_body",
          })
        );
      }

      const orchestrator = new MasterOrchestrator();
      const result = await orchestrator.dispatch({
        node: nodeKey,
        operation: payload.operation || "proxy_default",
        method: payload.method || "GET",
        body: payload.body != null ? payload.body : null,
        query: typeof payload.query === "string" ? payload.query : "",
      });

      const enriched = injectUserMetadata(result, userId);
      const httpStatus = enriched.success ? 200 : 502;
      return res.status(httpStatus).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "master_orchestrate_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.post("/url-campaign", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const url = typeof body.url === "string" ? body.url.trim() : "";
      const requestedEngineTier =
        typeof body.requested_engine_tier === "string" ? body.requested_engine_tier.trim() : null;
      const useUserKey = body.use_user_key === true;
      if (!url) {
        return res.status(400).json(
          errorResponse("Body debe incluir `url` (string https://...)", {
            node: "url_campaign_gateway",
            code: "missing_url",
          })
        );
      }

      const result = await runUrlCampaignPipeline({
        url,
        user_id: userId,
        requested_engine_tier: requestedEngineTier,
        use_user_key: useUserKey,
      });
      const enriched = injectUserMetadata(result, userId);
      const httpStatus = enriched.success ? 200 : enriched.success === false ? 502 : 500;
      return res.status(httpStatus).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "url_campaign_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.get("/engines", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      const engines = getActiveEngines();
      const result = successResponse(
        engines,
        {
          node: "engines_gateway",
          count: engines.length,
        }
      );
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "engines_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.get("/ai-settings/keys", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "ai_settings_keys_gateway",
            code: "unauthorized",
          })
        );
      }
      const keys = await listUserApiKeys(userId);
      return res.status(200).json(
        successResponse(keys, {
          node: "ai_settings_keys_gateway",
          count: keys.length,
        })
      );
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "ai_settings_keys_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.post("/ai-settings/test-key", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "ai_settings_test_key_gateway",
            code: "unauthorized",
          })
        );
      }
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const provider = typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "";
      const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
      if (!provider || !apiKey) {
        return res.status(400).json(
          errorResponse("provider y api_key son requeridos", {
            node: "ai_settings_test_key_gateway",
            code: "missing_fields",
          })
        );
      }
      const check = await testProviderKey(provider, apiKey);
      if (!check.ok) {
        return res.status(400).json(
          errorResponse(check.error || `Test falló (status ${check.status || "n/a"})`, {
            node: "ai_settings_test_key_gateway",
            code: "invalid_key",
            provider,
            provider_status: check.status || null,
          })
        );
      }
      return res.status(200).json(
        successResponse(
          { provider, valid: true },
          { node: "ai_settings_test_key_gateway", provider, provider_status: check.status || null }
        )
      );
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "ai_settings_test_key_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.post("/ai-settings/keys", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "ai_settings_upsert_key_gateway",
            code: "unauthorized",
          })
        );
      }
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const provider = typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "";
      const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
      if (!provider || !apiKey) {
        return res.status(400).json(
          errorResponse("provider y api_key son requeridos", {
            node: "ai_settings_upsert_key_gateway",
            code: "missing_fields",
          })
        );
      }
      const upsert = await upsertUserApiKey(userId, provider, apiKey);
      if (!upsert.ok) {
        return res.status(400).json(
          errorResponse(upsert.error || "No se pudo guardar la key", {
            node: "ai_settings_upsert_key_gateway",
            code: "upsert_failed",
          })
        );
      }
      return res.status(200).json(
        successResponse(
          { provider, saved: true },
          {
            node: "ai_settings_upsert_key_gateway",
            provider,
          }
        )
      );
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "ai_settings_upsert_key_gateway",
          code: "unhandled",
        })
      );
    }
  });

  // Opción Nuclear: borrado permanente de key por proveedor.
  router.delete("/ads/vault/:provider", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "ads_vault_delete_gateway",
            code: "unauthorized",
          })
        );
      }
      const provider = typeof req.params?.provider === "string" ? req.params.provider.trim().toLowerCase() : "";
      if (!provider) {
        return res.status(400).json(
          errorResponse("provider es requerido", {
            node: "ads_vault_delete_gateway",
            code: "missing_provider",
          })
        );
      }

      // Strict ownership check enforced in repository by user_id + provider filters.
      const removed = await deleteUserApiKey(userId, provider);
      if (!removed.ok) {
        return res.status(400).json(
          errorResponse(removed.error || "No se pudo eliminar la key", {
            node: "ads_vault_delete_gateway",
            code: "delete_failed",
            provider,
          })
        );
      }
      return res.status(200).json(
        successResponse(
          {
            provider,
            deleted: removed.deleted === true,
          },
          {
            node: "ads_vault_delete_gateway",
          }
        )
      );
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "ads_vault_delete_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.post("/publish-draft", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "publish_draft_gateway",
            code: "unauthorized",
          })
        );
      }

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const draftId = typeof body.draft_id === "string" ? body.draft_id.trim() : "";
      if (!draftId) {
        return res.status(400).json(
          errorResponse("Body debe incluir `draft_id` (UUID)", {
            node: "publish_draft_gateway",
            code: "missing_draft_id",
          })
        );
      }

      const draft = await getDraftById(draftId);
      if (!draft) {
        return res.status(404).json(
          errorResponse("Borrador no encontrado", {
            node: "publish_draft_gateway",
            code: "not_found",
          })
        );
      }
      if (String(draft.user_id) !== String(userId)) {
        return res.status(403).json(
          errorResponse("No tienes permiso para este borrador", {
            node: "publish_draft_gateway",
            code: "forbidden",
          })
        );
      }

      if (draft.status === "published") {
        return res.status(400).json(
          errorResponse("El borrador ya fue publicado", {
            node: "publish_draft_gateway",
            code: "already_published",
          }, { draft_id: draftId })
        );
      }

      if (draft.status === "discarded") {
        return res.status(400).json(
          errorResponse("El borrador está descartado y no puede publicarse", {
            node: "publish_draft_gateway",
            code: "discarded",
          }, { draft_id: draftId })
        );
      }

      const makePayload = buildMakeDispatchPayloadFromDraft(draft);
      const makeResult = await dispatchMakeWebhook(makePayload, { force: true });

      if (!makeResult.success) {
        return res.status(502).json(
          errorResponse(
            makeResult.error || makeResult.reason || "Fallo al enviar la orden a Make",
            {
              node: "publish_draft_gateway",
              code: "make_dispatch_failed",
              make_reason: makeResult.reason,
            },
            { make: makeResult }
          )
        );
      }

      const marked = await markDraftAsStatus(draftId, "published");
      if (!marked.ok) {
        return res.status(502).json(
          errorResponse(marked.error || "No se pudo actualizar el estado del borrador", {
            node: "publish_draft_gateway",
            code: "db_update_failed",
          })
        );
      }

      const result = successResponse(
        {
          draft_id: draftId,
          published: true,
          make_job_id: makeResult.job_id ?? null,
        },
        {
          node: "publish_draft_gateway",
          cost_est: 0,
        }
      );
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "publish_draft_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.get("/finance/report", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "finance_report_gateway",
            code: "unauthorized",
          })
        );
      }

      const summary = await getEarningsSummary(userId);
      if (!summary.success) {
        return res.status(502).json(
          errorResponse(summary.error || "No se pudo consultar el reporte financiero", {
            node: "finance_report_gateway",
            code: "finance_report_failed",
          })
        );
      }

      const payload = {
        total_revenue: summary.data?.total_revenue || 0,
        available_balance: summary.data?.available_balance || 0,
        ai_spend: summary.data?.ai_spend || 0,
        platform_breakdown: Array.isArray(summary.data?.platform_breakdown)
          ? summary.data.platform_breakdown
          : [],
        recent_transactions: Array.isArray(summary.data?.recent_transactions)
          ? summary.data.recent_transactions
          : [],
      };

      const result = successResponse(payload, {
        node: "finance_report_gateway",
        count_transactions: payload.recent_transactions.length,
      });
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "finance_report_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.post("/affiliates/sync-stock", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "affiliates_sync_stock_gateway",
            code: "unauthorized",
          })
        );
      }

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        return res.status(400).json(
          errorResponse("Body debe incluir `items` con al menos un elemento", {
            node: "affiliates_sync_stock_gateway",
            code: "missing_items",
          })
        );
      }

      const parsed = items
        .map((it) => {
          if (!it || typeof it !== "object") return null;
          const id = typeof it.id === "string" ? it.id.trim() : "";
          const store = normalizeStore(typeof it.store === "string" ? it.store : "");
          if (!id || !store) return null;
          return { id, store };
        })
        .filter(Boolean);

      const meliIds = parsed.filter((i) => i.store === "mercadolibre").map((i) => i.id);
      const aeIds = parsed.filter((i) => i.store === "aliexpress").map((i) => i.id);
      const wooIds = parsed.filter((i) => i.store === "woocommerce").map((i) => i.id);
      const unknownStore = parsed
        .filter((i) => i.store !== "mercadolibre" && i.store !== "aliexpress" && i.store !== "woocommerce")
        .map((i) => ({
          id: i.id,
          stock_status: "unknown",
          updated_price: null,
          store: i.store,
        }));

      const meliAdapter = new MercadoLibreAdapter();
      const aeAdapter = new AliExpressAdapter();
      const wooAdapter = new WooCommerceAdapter();
      const TIMEOUT_MS = 2800;

      const [meliResult, aeResult, wooResult] = await Promise.allSettled([
        meliIds.length > 0
          ? withTimeout(meliAdapter.checkStockBatch(meliIds, { timeoutMs: 2000, concurrency: 8 }), TIMEOUT_MS)
          : Promise.resolve([]),
        aeIds.length > 0
          ? withTimeout(aeAdapter.checkStockBatch(aeIds, { concurrency: 6 }), TIMEOUT_MS)
          : Promise.resolve([]),
        wooIds.length > 0
          ? withTimeout(wooAdapter.checkStockBatch(wooIds, { concurrency: 6, timeoutMs: 2200 }), TIMEOUT_MS)
          : Promise.resolve([]),
      ]);

      const merged = [];
      if (meliResult.status === "fulfilled") {
        for (const row of meliResult.value) {
          merged.push({ ...row, store: "mercadolibre" });
        }
      }
      if (aeResult.status === "fulfilled") {
        for (const row of aeResult.value) {
          merged.push({ ...row, store: "aliexpress" });
        }
      }
      if (wooResult.status === "fulfilled") {
        for (const row of wooResult.value) {
          merged.push({ ...row, store: "woocommerce" });
        }
      }
      merged.push(...unknownStore);

      // Guarantee shape/order and autosanación fallback (cache -> unknown).
      const byKey = new Map(
        merged.map((r) => [`${normalizeStore(r.store)}:${String(r.id)}`, r])
      );
      const nowIso = new Date().toISOString();
      const responseItems = parsed.map((item) => {
        const key = `${item.store}:${item.id}`;
        const live = byKey.get(key);
        if (live) {
          const record = {
            id: String(live.id),
            stock_status:
              live.stock_status === "in_stock" || live.stock_status === "out_of_stock"
                ? live.stock_status
                : "unknown",
            updated_price: Number.isFinite(Number(live.updated_price)) ? Number(live.updated_price) : null,
            store: item.store,
          };
          STOCK_SYNC_CACHE.set(key, { ...record, at: nowIso });
          return record;
        }
        const cached = STOCK_SYNC_CACHE.get(key);
        if (cached) {
          return {
            id: item.id,
            stock_status: cached.stock_status,
            updated_price: cached.updated_price,
            store: item.store,
          };
        }
        return {
          id: item.id,
          stock_status: "unknown",
          updated_price: null,
          store: item.store,
        };
      });

      const result = successResponse(responseItems, {
        node: "affiliates_sync_stock_gateway",
        count: responseItems.length,
        timeout_ms: 3000,
      });
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "affiliates_sync_stock_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.post("/affiliates/woocommerce/top-products", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "woocommerce_top_products_gateway",
            code: "unauthorized",
          })
        );
      }
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const credentials =
        body.credentials && typeof body.credentials === "object" ? body.credentials : {};

      const adapter = new WooCommerceAdapter();
      const rows = await adapter.getTopProducts({ credentials });
      if (Array.isArray(rows) && rows[0] && rows[0].error === "STORE_AUTH_FAILED") {
        return res.status(403).json(
          errorResponse("STORE_AUTH_FAILED", {
            node: "woocommerce_top_products_gateway",
            code: "STORE_AUTH_FAILED",
            needs_reconnect: true,
          })
        );
      }

      const result = successResponse(rows, {
        node: "woocommerce_top_products_gateway",
        count: Array.isArray(rows) ? rows.length : 0,
      });
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "woocommerce_top_products_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.post("/ads/register-id", allowInternalOrAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const draftId = typeof body.draft_id === "string" ? body.draft_id.trim() : "";
      const platformAdId = typeof body.platform_ad_id === "string" ? body.platform_ad_id.trim() : "";
      const platformName = typeof body.platform_name === "string" ? body.platform_name.trim().toLowerCase() : "";
      const mappingStatus = typeof body.status === "string" ? body.status.trim().toLowerCase() : "active";

      if (!draftId || !isUuid(draftId)) {
        return res.status(400).json(
          errorResponse("draft_id inválido (UUID requerido)", {
            node: "ads_register_id_gateway",
            code: "invalid_draft_id",
          })
        );
      }
      if (!platformAdId) {
        return res.status(400).json(
          errorResponse("platform_ad_id es requerido", {
            node: "ads_register_id_gateway",
            code: "missing_platform_ad_id",
          })
        );
      }
      if (!platformName) {
        return res.status(400).json(
          errorResponse("platform_name es requerido", {
            node: "ads_register_id_gateway",
            code: "missing_platform_name",
          })
        );
      }

      const mapping = await upsertAdMapping({
        draft_id: draftId,
        platform_ad_id: platformAdId,
        platform_name: platformName,
        status: mappingStatus,
      });
      if (!mapping.ok) {
        return res.status(502).json(
          errorResponse(mapping.error || "No se pudo guardar el mapping", {
            node: "ads_register_id_gateway",
            code: "mapping_upsert_failed",
          })
        );
      }

      const patchDraft = await setDraftPlatformAdId(draftId, platformAdId);
      if (!patchDraft.ok) {
        return res.status(502).json(
          errorResponse(patchDraft.error || "No se pudo actualizar metadata del draft", {
            node: "ads_register_id_gateway",
            code: "draft_metadata_update_failed",
          })
        );
      }

      const result = successResponse(
        {
          draft_id: draftId,
          platform_name: platformName,
          platform_ad_id: platformAdId,
          status: mappingStatus,
        },
        {
          node: "ads_register_id_gateway",
          internal: req.internalAuth === true,
        }
      );
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "ads_register_id_gateway",
          code: "unhandled",
        })
      );
    }
  });
}

module.exports = {
  attachPublicMasterRoutes,
};
