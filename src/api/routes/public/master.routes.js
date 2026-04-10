/**
 * Master Public Gateway (v2.9 Security Fortress)
 * - POST /automated-play → X-FIFER-INTERNAL-KEY (bot / ISC; sin JWT)
 * - POST /orchestrate → requireAuth
 * - POST /url-campaign → requireAuth (Web Ingestion Node v3.0)
 * - POST /publish-draft → requireAuth (publicar borrador → Make `MAKE_PUBLISH_WEBHOOK_URL`, estado `processing_external`)
 * - PATCH /publish-callback → header `x-fifer-secret` (`FIFER_PUBLISH_CALLBACK_SECRET`); Make acusa URL final → `published`
 * - GET /campaign-drafts → requireAuth (historial de borradores del usuario)
 * - GET /finance/report → requireAuth (reporte financiero + ledger / ROI)
 * - GET /finance/platform-ranking → requireAuth (Top plataformas por sale_commission, 7 días)
 * - GET /finance/cost-savings → requireAuth (ahorro router IA vs baseline premium, mes UTC actual)
 * - GET /user/subscription → requireAuth (tier `fifer_auth.user_profile` + flags BYOK para UI)
 *
 * Cualquier ruta GET/POST futura de orquestación orientada a usuarios debe usar `requireAuth`.
 * Montaje: `express.Router()` + `attachPublicMasterRoutes(router)`.
 * Webhooks: `POST /webhooks/universal` (Gateway polimórfico; ver `webhook.routes.js`).
 * Discovery: `GET /ai-capabilities` (catálogo `fifer_platform.ai_capabilities`; ver `discovery_worker.js`).
 * Stripe: `POST /stripe/webhook` **no** se define aquí — el cuerpo debe ser RAW; se monta en `src/api/http_server.js` **antes** de `express.json()` (ver `stripe.routes.js`).
 * Monitor: `GET /system/api-health` (tabla `fifer_platform.api_health_status`; ver `api_health_monitor.js`).
 * Curador: `POST /ai/recommend` (recomendaciones por producto; ver `curator_service.js`). `POST /url-campaign` incluye `data.curator` al completar.
 */
const path = require("path");
const express = require("express");

/** TypeScript: `AIOrchestrator` (`src/lib/ai/AIOrchestrator.ts`) vía `src/api/v1/ai/proxy.ts` — requiere `tsx`. */
function tryRegisterFiferAiProxy(router, requireAuthMiddleware) {
  try {
    require("tsx/cjs/api").register();
  } catch (e) {
    console.warn(
      "[FIFER] tsx no disponible — omite POST /ai/proxy. Instala `tsx` o ejecuta el API con soporte TS.",
      e?.message || e
    );
    return;
  }
  try {
    const { createAiProxyHandler } = require(path.join(__dirname, "../../v1/ai/proxy.ts"));
    router.post("/ai/proxy", requireAuthMiddleware, createAiProxyHandler());
  } catch (e) {
    console.warn("[FIFER] No se montó /ai/proxy:", e?.message || e);
  }
}
const { requireAuth } = require(path.join(__dirname, "../../middlewares/auth_supabase.js"));
const { attachPublicWebhookRoutes } = require(path.join(__dirname, "./webhook.routes.js"));
const { internalAuth } = require(path.join(__dirname, "../../middlewares/internal_auth.js"));
const { runAutomatedPlay } = require(path.join(__dirname, "../../master/run_automated_play.js"));
const { MasterOrchestrator } = require(path.join(__dirname, "../../master/master_orchestrator.js"));
const { successResponse, errorResponse } = require(path.join(__dirname, "../../../utils/response_builder.js"));
const { runUrlCampaignPipeline } = require(path.join(__dirname, "../../master/pipelines/url_campaign_pipeline.js"));
const { getActiveEngines } = require(path.join(__dirname, "../../../config/ai_engines.js"));
const {
  getDraftById,
  upsertAdMapping,
  setDraftPlatformAdId,
  listDraftsForUser,
  finalizeDraftExternalPublish,
} = require(path.join(__dirname, "../../../modules/fifer-platform/campaigns/draftRepository.js"));
const { dispatchToMake } = require(path.join(__dirname, "../../../services/publish_service.js"));
const { getEarningsSummary } = require(path.join(
  __dirname,
  "../../../modules/fifer-platform/finance-bridge/finance_client.js"
));
const {
  getWeeklyIncomeFromLedger,
  getRecentLedgerEntries,
  getRoiForUserPublishedDrafts,
  getPlatformProfitRanking,
  registerManualIncome,
} = require(path.join(__dirname, "../../../services/finance_service.js"));
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
const {
  listAiCapabilities,
  fetchCapabilitiesForCurator,
} = require(path.join(__dirname, "../../../system/discovery_worker.js"));
const { listApiHealthStatus, runHealthCheckCycle } = require(path.join(
  __dirname,
  "../../../system/api_health_monitor.js"
));
const { recommendCapabilities } = require(path.join(__dirname, "../../../services/ai/curator_service.js"));
const { getCostSavingsCurrentMonth } = require(path.join(__dirname, "../../../services/ai/ai_task_router.js"));
const { getUserSubscriptionProfile } = require(path.join(
  __dirname,
  "../../../modules/fifer-platform/auth/userProfileRepository.js"
));
const { hasVaultProviderKey } = require(path.join(__dirname, "../../../modules/fifer-platform/auth/byokVault.js"));

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

/** Webhook de retorno Make.com: solo escenarios con el mismo secreto compartido. */
function requirePublishCallbackSecret(req, res, next) {
  const expected = String(process.env.FIFER_PUBLISH_CALLBACK_SECRET || "").trim();
  const incoming = String(req.headers["x-fifer-secret"] || "").trim();
  if (!expected) {
    return res.status(503).json(
      errorResponse("FIFER_PUBLISH_CALLBACK_SECRET no configurado en el servidor", {
        node: "publish_callback_gateway",
        code: "secret_not_configured",
      })
    );
  }
  if (!incoming || incoming !== expected) {
    return res.status(401).json(
      errorResponse("No autorizado", {
        node: "publish_callback_gateway",
        code: "invalid_secret",
      })
    );
  }
  next();
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
  const webhookRouter = express.Router();
  attachPublicWebhookRoutes(webhookRouter);
  router.use("/webhooks", webhookRouter);

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

  router.post("/ai/recommend", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const productData =
        body.productData && typeof body.productData === "object" ? body.productData : body;
      const caps = await fetchCapabilitiesForCurator();
      if (!caps.length) {
        const empty = successResponse(
          { voices: [], text_models: [], product_signals: {} },
          { node: "ai_curator", empty_catalog: true }
        );
        return res.status(200).json(injectUserMetadata(empty, userId));
      }
      const out = await recommendCapabilities(productData, caps, { userId });
      const result = successResponse(out, {
        node: "ai_curator",
        voice_count: out.voices.length,
        model_count: out.text_models.length,
      });
      return res.status(200).json(injectUserMetadata(result, userId));
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "ai_curator",
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

  router.get("/system/api-health", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      const out = await listApiHealthStatus();
      if (!out.ok) {
        return res.status(503).json(
          errorResponse(out.error || "api_health_unavailable", {
            node: "api_health_gateway",
            code: out.error === "supabase_not_configured" ? "supabase_not_configured" : "query_failed",
          })
        );
      }
      const result = successResponse(out.data, {
        node: "api_health_gateway",
        count: out.data.length,
      });
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "api_health_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.post("/system/api-health/refresh", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      const cycle = await runHealthCheckCycle();
      if (!cycle.ok) {
        return res.status(503).json(
          errorResponse(cycle.detail || "api_health_refresh_failed", {
            node: "api_health_gateway",
            code: cycle.detail === "supabase_not_configured" ? "supabase_not_configured" : "refresh_failed",
          })
        );
      }
      const out = await listApiHealthStatus();
      const rows = out.ok ? out.data : [];
      const result = successResponse(
        { refreshed: true, upserted: cycle.upserted, providers: rows },
        {
          node: "api_health_gateway",
          action: "refresh",
          count: rows.length,
        }
      );
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "api_health_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.get("/user/subscription", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "user_subscription_gateway",
            code: "unauthorized",
          })
        );
      }
      const prof = await getUserSubscriptionProfile(userId);
      const byok_openai = await hasVaultProviderKey(userId, "openai");
      const byok_anthropic = await hasVaultProviderKey(userId, "anthropic");
      const result = successResponse(
        {
          subscription_tier: prof.tier,
          tier_expires_at: prof.tier_expires_at ?? null,
          expired_pro: Boolean(prof.expired_pro),
          byok_openai,
          byok_anthropic,
        },
        { node: "user_subscription_gateway" }
      );
      return res.status(200).json(injectUserMetadata(result, userId));
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "user_subscription_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.get("/ai-capabilities", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
      const provider = typeof req.query.provider === "string" ? req.query.provider.trim() : "";
      const out = await listAiCapabilities({ type, provider });
      if (!out.ok) {
        return res.status(503).json(
          errorResponse(out.error || "ai_capabilities_unavailable", {
            node: "ai_capabilities_gateway",
            code: out.error === "supabase_not_configured" ? "supabase_not_configured" : "query_failed",
          })
        );
      }
      const result = successResponse(out.data, {
        node: "ai_capabilities_gateway",
        count: out.data.length,
        filters: { type: type || null, provider: provider || null },
      });
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "ai_capabilities_gateway",
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

      if (draft.status === "paused_by_inventory") {
        return res.status(400).json(
          errorResponse("La campaña está pausada por inventario; no se puede publicar hasta reanudar.", {
            node: "publish_draft_gateway",
            code: "paused_by_inventory",
          }, { draft_id: draftId })
        );
      }

      const makeResult = await dispatchToMake(draftId);

      if (!makeResult.success) {
        const statusCode =
          makeResult.reason === "not_found"
            ? 404
            : makeResult.reason === "invalid_status"
              ? 400
              : makeResult.reason === "missing_publish_webhook_url"
                ? 503
                : 502;
        return res.status(statusCode).json(
          errorResponse(
            makeResult.error || makeResult.reason || "Fallo al enviar el borrador a Make",
            {
              node: "publish_draft_gateway",
              code: "make_dispatch_failed",
              make_reason: makeResult.reason,
            },
            { make: makeResult }
          )
        );
      }

      const result = successResponse(
        {
          draft_id: draftId,
          status: "processing_external",
          dispatched: true,
          http_status: makeResult.http_status ?? null,
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

  router.get("/campaign-drafts", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "campaign_drafts_list",
            code: "unauthorized",
          })
        );
      }
      const limit = Number(req.query.limit);
      const listed = await listDraftsForUser(userId, Number.isFinite(limit) ? limit : 50);
      if (!listed.ok) {
        return res.status(502).json(
          errorResponse(listed.error || "No se pudieron listar los borradores", {
            node: "campaign_drafts_list",
            code: "list_failed",
          })
        );
      }
      const result = successResponse(
        { drafts: listed.rows },
        { node: "campaign_drafts_list", cost_est: 0 }
      );
      return res.status(200).json(injectUserMetadata(result, userId));
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "campaign_drafts_list",
          code: "unhandled",
        })
      );
    }
  });

  router.patch("/publish-callback", requirePublishCallbackSecret, async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const draftId = typeof body.draft_id === "string" ? body.draft_id.trim() : "";
      const publishedUrl =
        typeof body.published_url === "string" ? body.published_url.trim() : "";
      const platform = typeof body.platform === "string" ? body.platform.trim() : "";

      if (!draftId || !isUuid(draftId)) {
        return res.status(400).json(
          errorResponse("Body debe incluir `draft_id` (UUID válido)", {
            node: "publish_callback_gateway",
            code: "invalid_draft_id",
          })
        );
      }
      if (!publishedUrl) {
        return res.status(400).json(
          errorResponse("Body debe incluir `published_url` (TEXT, URL http(s))", {
            node: "publish_callback_gateway",
            code: "missing_published_url",
          })
        );
      }

      const done = await finalizeDraftExternalPublish(draftId, {
        published_url: publishedUrl,
        platform: platform || null,
      });

      if (!done.ok) {
        const code = done.error || "callback_failed";
        const statusMap = {
          not_found: 404,
          invalid_draft_state: 409,
          invalid_published_url: 400,
          missing_published_url: 400,
          missing_draft_id: 400,
        };
        const httpStatus = statusMap[done.error] || 502;
        return res.status(httpStatus).json(
          errorResponse(done.error || "Fallo al finalizar publicación", {
            node: "publish_callback_gateway",
            code,
            draft_status: done.status,
          }, { details: done.details })
        );
      }

      return res.status(200).json(
        successResponse(
          { draft_id: draftId, status: "published", published_url: publishedUrl },
          { node: "publish_callback_gateway", cost_est: 0 }
        )
      );
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "publish_callback_gateway",
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

      const [weeklyIncome, ledgerRecent, campaign_rois] = await Promise.all([
        getWeeklyIncomeFromLedger(userId, 8),
        getRecentLedgerEntries(userId, 12),
        getRoiForUserPublishedDrafts(userId, 12),
      ]);

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
        weekly_income_usd: weeklyIncome,
        ledger_recent: ledgerRecent,
        campaign_rois,
      };

      const result = successResponse(payload, {
        node: "finance_report_gateway",
        count_transactions: payload.recent_transactions.length,
        ledger_entries: ledgerRecent.length,
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

  router.get("/finance/platform-ranking", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "finance_platform_ranking_gateway",
            code: "unauthorized",
          })
        );
      }

      const payload = await getPlatformProfitRanking(userId);
      const result = successResponse(payload, {
        node: "finance_platform_ranking_gateway",
        count: payload.ranking?.length ?? 0,
      });
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "finance_platform_ranking_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.get("/finance/cost-savings", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "finance_cost_savings_gateway",
            code: "unauthorized",
          })
        );
      }

      const out = await getCostSavingsCurrentMonth();
      if (!out.ok) {
        return res.status(503).json(
          errorResponse(out.error || "No se pudo leer ai_usage_logs", {
            node: "finance_cost_savings_gateway",
            code: "cost_savings_unavailable",
          })
        );
      }

      const result = successResponse(out.data, {
        node: "finance_cost_savings_gateway",
        groups: out.data?.by_task_type?.length ?? 0,
      });
      const enriched = injectUserMetadata(result, userId);
      return res.status(200).json(enriched);
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "finance_cost_savings_gateway",
          code: "unhandled",
        })
      );
    }
  });

  router.post("/finance/manual-income", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.supabaseUser?.id || null;
      if (!userId) {
        return res.status(401).json(
          errorResponse("Autenticación requerida", {
            node: "finance_manual_income_gateway",
            code: "unauthorized",
          })
        );
      }
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const amount = Number(body.amount);
      const note = typeof body.note === "string" ? body.note : "";
      const out = await registerManualIncome(userId, amount, note);
      if (!out.ok) {
        return res.status(400).json(
          errorResponse(out.error || "manual_income_failed", {
            node: "finance_manual_income_gateway",
            code: "manual_income_failed",
          })
        );
      }
      return res.status(200).json(
        successResponse(
          { amount: out.amount, balance: out.balance },
          { node: "finance_manual_income_gateway", persisted: true }
        )
      );
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "finance_manual_income_gateway",
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

  tryRegisterFiferAiProxy(router, requireAuth);
}

module.exports = {
  attachPublicMasterRoutes,
};
