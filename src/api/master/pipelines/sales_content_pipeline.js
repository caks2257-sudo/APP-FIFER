/**
 * Sales + content automation pipeline with Financial Circuit Breaker (Stage 0 pre-flight),
 * Tag-Center graceful degradation (v2.4), and simulated async Marketing (Nervous System).
 */
const { randomUUID } = require("crypto");
const {
  estimateLines,
  DEFAULT_RATES,
} = require("../../../../saas-fifer/modules/fifer-platform/credits/creditSimulator.js");
const { successResponse, errorResponse } = require("../../../utils/response_builder.js");
const { callTagCenter, callMarketing } = require("./internal_api_helpers.js");
const jobStore = require("../jobs/job_store.js");
const { dispatchMakeWebhook } = require("../../../services/publish_service.js");
const {
  recommendEngineForNiche,
  normalizeTier,
  getEngineByTier,
} = require("../../../config/ai_engines.js");
const {
  maybeAttachPremiumVideo,
  resolveMarketingAuthContext,
} = require("../../../modules/fifer-platform/creative-bot/marketingRepository.js");
const {
  getCampaignBudget,
  reportCampaignCost,
  reserveAiSpendAtomic,
} = require("../../../modules/fifer-platform/finance-bridge/finance_client.js");
const {
  attachRawProductDataToPipelineData,
} = require("../../../modules/fifer-platform/tag-center/tagRepository.js");

/** Legacy shape kept for compatibility; prefer `strategyContext` for routing. */
const DEFAULT_STRATEGY = {
  source: "DEFAULT_STRATEGY",
  reason: "tag_center_unavailable",
  tags: [],
  routing: "generic_content",
  confidence: 0,
  policy: "continue_pipeline_without_tag_context",
};

/** Default routing context when Tag-Center is down/disabled (Phase 6). */
const DEFAULT_STRATEGY_CONTEXT = {
  tags: ["general"],
  score: 50,
  urgency_level: "NORMAL",
};

/** Gemini-ish pre-flight: 500 input + 200 output tokens (as 1k_token units). */
const DEFAULT_PREFLIGHT = {
  inputTokens: 500,
  outputTokens: 200,
  engineId: "gemini_flash_text",
};

const DEFAULT_MAX_BUDGET = 50;

/** AI work expected beyond this wall-clock threshold → async job (Nervous System). */
const AI_ASYNC_THRESHOLD_SEC = 10;

function isTagCenterUnavailable(tagResult) {
  if (!tagResult) return true;
  if (!tagResult.ok) return true;
  const err = String(tagResult.error || "");
  return err.startsWith("node_disabled:");
}

function resolveMinCommissionThreshold() {
  const n = Number(process.env.MIN_COMMISSION_THRESHOLD);
  return Number.isFinite(n) ? n : 3.0;
}

function parseCommissionRate(rate) {
  if (rate == null) return null;
  const raw = String(rate).trim();
  if (!raw) return null;
  const normalized = raw.replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function evaluateProfitabilityGate(rawProductData) {
  const threshold = resolveMinCommissionThreshold();
  const commission = parseCommissionRate(rawProductData?.commission_rate);
  if (commission == null) {
    return { pass: true, commission_rate: null, threshold, reason: "missing_commission_rate" };
  }
  if (commission < threshold) {
    return { pass: false, commission_rate: commission, threshold, reason: "below_threshold" };
  }
  return { pass: true, commission_rate: commission, threshold, reason: "ok" };
}

/**
 * Stage 0: estimate credits for a minimal text generation step (circuit breaker).
 */
function runPreFlightCreditEstimate(overrides = {}) {
  const inputTokens = Number(overrides.inputTokens ?? DEFAULT_PREFLIGHT.inputTokens);
  const outputTokens = Number(overrides.outputTokens ?? DEFAULT_PREFLIGHT.outputTokens);
  const engineId = overrides.engineId || DEFAULT_PREFLIGHT.engineId;

  const lines = [
    { engineId, unit: "1k_tokens", qty: inputTokens / 1000 },
    { engineId, unit: "1k_tokens", qty: outputTokens / 1000 },
  ];

  return estimateLines(DEFAULT_RATES, lines);
}

/**
 * Marketing is treated as long-running (simulated): return job_id + processing without blocking.
 * Set `simulateAsyncMarketing: false` for synchronous HTTP (e.g. tests) or `FIFER_SIMULATE_ASYNC_MARKETING=false`.
 */
function shouldSimulateAsyncMarketing(options = {}) {
  if (isDryRun(options)) return false;
  if (options.simulateAsyncMarketing === false) return false;
  if (options.simulateAsyncMarketing === true) return true;
  const env = String(process.env.FIFER_SIMULATE_ASYNC_MARKETING || "").trim().toLowerCase();
  if (env === "0" || env === "false" || env === "off") return false;
  return true;
}

function isDryRun(options = {}) {
  if (options.dry_run === true) return true;
  return process.env.FEATURE_DRY_RUN === "true";
}

function resolveRequestedEngineTier(options = {}, tagPayload = null) {
  const explicit = normalizeTier(
    options.requested_engine_tier || options?.marketing?.body?.requested_engine_tier
  );
  if (explicit) {
    const eng = getEngineByTier(explicit);
    if (eng && eng.is_active) return explicit;
  }
  const nicheCandidate =
    options.niche ||
    options?.raw_product_data?.category ||
    tagPayload?.strategyContext?.primary_niche ||
    options.product_name ||
    "";
  const recommended = recommendEngineForNiche(nicheCandidate);
  const recEngine = getEngineByTier(recommended);
  if (recEngine && recEngine.is_active) return recommended;
  return "economic";
}

function withEngineTier(marketingOpts = {}, tier = "economic") {
  const base = marketingOpts || {};
  const body = base.body && typeof base.body === "object" ? { ...base.body } : {};
  return {
    ...base,
    body: {
      ...body,
      requested_engine_tier: tier,
    },
  };
}

function withByokContext(marketingOpts = {}, byok = {}) {
  const base = marketingOpts || {};
  const body = base.body && typeof base.body === "object" ? { ...base.body } : {};
  return {
    ...base,
    body: {
      ...body,
      ai_auth_mode: byok.auth_mode || "master_key",
      ai_provider: byok.provider || null,
      user_api_key: byok.provider_api_key || null,
      use_user_key: byok.auth_mode === "user_key",
    },
  };
}

async function callMarketingWithAutoFallback(options = {}, engineRequested = "economic", byok = {}) {
  const requested = normalizeTier(engineRequested) || "economic";
  const enrichWithVideo = async (payload, tierUsed) => {
    const e = await maybeAttachPremiumVideo(payload, {
      engine_tier: tierUsed,
      campaign_id: options.pipeline_job_id || null,
      brand: options.product_name || null,
    });
    return {
      payload: e.payload,
      video_enrichment: e.video_enrichment,
      video_job_id: e.video_job_id || null,
      video_error: e.video_error || null,
    };
  };

  try {
    const primary = await callMarketing(
      withByokContext(
        withEngineTier(options.marketing || { method: "GET", query: "" }, requested),
        byok
      )
    );
    if (!primary.ok) {
      const err = new Error(primary.error || "marketing_request_failed");
      err._primary = primary;
      throw err;
    }
    const enriched = await enrichWithVideo(primary.data, requested);
    return {
      ok: true,
      data: enriched.payload,
      status: primary.status,
      engine_requested: requested,
      engine_used: requested,
      fallback_applied: false,
      video_enrichment: enriched.video_enrichment,
      video_job_id: enriched.video_job_id,
      video_error: enriched.video_error,
    };
  } catch (err) {
    if (requested === "economic") {
      const p = err?._primary;
      return {
        ok: false,
        data: p?.data || null,
        status: p?.status || 0,
        error: err?.message || "marketing_request_failed",
        engine_requested: requested,
        engine_used: requested,
        fallback_applied: false,
      };
    }

    console.warn("⚠️ Premium AI failed, falling back to Economic");
    const fallback = await callMarketing(
      withByokContext(
        withEngineTier(options.marketing || { method: "GET", query: "" }, "economic"),
        byok
      )
    );
    if (!fallback.ok) {
      return {
        ok: false,
        data: fallback.data,
        status: fallback.status,
        error: fallback.error || "marketing_request_failed",
        engine_requested: requested,
        engine_used: "economic",
        fallback_applied: true,
      };
    }
    const enriched = await enrichWithVideo(fallback.data, "economic");
    return {
      ok: true,
      data: enriched.payload,
      status: fallback.status,
      engine_requested: requested,
      engine_used: "economic",
      fallback_applied: true,
      video_enrichment: enriched.video_enrichment,
      video_job_id: enriched.video_job_id,
      video_error: enriched.video_error,
    };
  }
}

/**
 * Fire-and-forget: no await; no bloquea la respuesta HTTP del pipeline.
 */
function scheduleDispatchMakeWebhook({
  jobId,
  options,
  explicitStrategyContext,
  tagPayload,
  marketingData,
  dryRun,
}) {
  if (options && options.skipMakeWebhook === true) {
    return;
  }
  const sc =
    explicitStrategyContext ||
    tagPayload?.strategyContext ||
    DEFAULT_STRATEGY_CONTEXT;
  const product =
    options.product ||
    (options.product_id
      ? {
          id: options.product_id,
          name: options.product_name || "No Name",
          url: options.product_url || "",
        }
      : { id: "unknown", name: "No Name", url: "" });
  const caption =
    typeof marketingData === "string"
      ? marketingData
      : JSON.stringify(marketingData ?? {});
  const data = {
    product,
    strategy: {
      score: sc.score ?? 0,
      primary_niche: sc.primary_niche || sc.routing || "general",
      price_tier: sc.price_tier || "standard",
      tags: Array.isArray(sc.tags) ? sc.tags : [],
    },
    content: {
      format_type:
        marketingData?.format_type || options.content_format_type || "post",
      platforms: marketingData?.platforms || options.platforms || ["instagram"],
      video_url: marketingData?.video_url || "",
      caption,
      voice_id: marketingData?.voice_id || "",
    },
    metadata: {
      job_id: jobId || options.pipeline_job_id || "manual_trigger",
      is_simulation: Boolean(dryRun),
    },
  };
  setImmediate(() => {
    void dispatchMakeWebhook(data);
  });
}

function buildTagPayload(tagResult) {
  if (!isTagCenterUnavailable(tagResult)) {
    return { data: tagResult.data, strategyContext: null, degraded: false };
  }

  console.warn(
    "[sales_content_pipeline] Tag-Center unavailable; continuing with default strategyContext:",
    tagResult?.error || "unknown"
  );

  const strategyContext = {
    ...DEFAULT_STRATEGY_CONTEXT,
    source: "DEFAULT_STRATEGY",
    detail: tagResult?.error || "tag_center_failed",
    http_status: tagResult?.status,
  };

  return {
    data: {
      ...DEFAULT_STRATEGY,
      strategyContext,
    },
    strategyContext,
    degraded: true,
  };
}

/**
 * Full circle: pre-flight → Tag-Center (degradable) → Marketing (sync or simulated async).
 */
async function executeFullCircle(options = {}) {
  const t0 = Date.now();
  const latency = () => Date.now() - t0;

  const gate = evaluateProfitabilityGate(options.raw_product_data);
  if (!gate.pass) {
    return errorResponse(
      `Producto descartado por rentabilidad: comisión ${gate.commission_rate}% (< ${gate.threshold}%)`,
      {
        node: "sales_content_pipeline",
        code: "LOW_PROFITABILITY_ERROR",
        commission_rate: gate.commission_rate,
        min_commission_threshold: gate.threshold,
        latency_ms: latency(),
      },
      attachRawProductDataToPipelineData(
        {
          stage: "profitability_gate",
          aborted: true,
          discarded: true,
          discard_reason: "low_profitability",
        },
        options
      )
    );
  }

  const maxBudget = Number.isFinite(Number(options.max_budget))
    ? Number(options.max_budget)
    : DEFAULT_MAX_BUDGET;

  const { total: costEst, breakdown: preflightBreakdown } = runPreFlightCreditEstimate(
    options.preflight || {}
  );
  const preTagTier = resolveRequestedEngineTier(options, null);
  const preTagEngine = getEngineByTier(preTagTier);
  const engineEstimatedCost = Number(preTagEngine?.estimated_cost_usd);
  const adjustedCostEst = Number.isFinite(engineEstimatedCost)
    ? Math.max(costEst, engineEstimatedCost)
    : costEst;

  const budget = await getCampaignBudget(options.user_id || null, options.pipeline_job_id || null);
  const approvedBudget = Number(budget?.max_budget);
  if (Number.isFinite(approvedBudget) && approvedBudget < adjustedCostEst) {
    return errorResponse(
      `BUDGET_EXCEEDED_ERROR: estimated cost ${adjustedCostEst.toFixed(3)} exceeds approved budget ${approvedBudget.toFixed(3)}`,
      {
        node: "sales_content_pipeline",
        code: "BUDGET_EXCEEDED_ERROR",
        cost_est: adjustedCostEst,
        approved_budget: approvedBudget,
        currency: budget?.currency || "USD",
        latency_ms: latency(),
      },
      attachRawProductDataToPipelineData(
        {
          stage: "budget_gate",
          aborted: true,
          budget,
        },
        options
      )
    );
  }

  if (adjustedCostEst > maxBudget) {
    return errorResponse(
      `FINANCIAL_CIRCUIT_OPEN: estimated cost ${adjustedCostEst.toFixed(3)} credits exceeds max_budget ${maxBudget}`,
      {
        node: "sales_content_pipeline",
        cost_est: adjustedCostEst,
        latency_ms: latency(),
        circuit_breaker: true,
        max_budget: maxBudget,
        preflight_breakdown: preflightBreakdown,
      },
      { stage: "preflight", aborted: true }
    );
  }

  if (isDryRun(options)) {
    const mocks = require("../../../system/mocks/ai_responses.js");
    const tagPayload = {
      ...mocks.TAG_CENTER_MOCK,
      strategyContext: mocks.STRATEGY_CONTEXT_MOCK,
    };
    const engineRequested = resolveRequestedEngineTier(options, tagPayload);
    const explicitStrategyContext = mocks.STRATEGY_CONTEXT_MOCK;
    const marketingData = mocks.MARKETING_BOT_MOCK;

    scheduleDispatchMakeWebhook({
      jobId: options.pipeline_job_id || `dry-run-${randomUUID()}`,
      options,
      explicitStrategyContext,
      tagPayload,
      marketingData,
      dryRun: true,
    });

    return successResponse(
      attachRawProductDataToPipelineData(
        {
          dry_run: true,
          stages: ["preflight", "tag_center", "marketing"],
          tag_center: tagPayload,
          strategyContext: explicitStrategyContext,
          marketing: marketingData,
          graceful_degradation: [],
          degraded: false,
          note:
            "Dry run: sin llamadas a Tag-Center ni Marketing; mocks inyectados. cost_est sigue siendo estimación del simulador.",
        },
        options
      ),
      {
        node: "sales_content_pipeline",
        cost_est: adjustedCostEst,
        latency_ms: latency(),
        max_budget: maxBudget,
        preflight_breakdown: preflightBreakdown,
        cost_saved: true,
        dry_run: true,
        simulated: true,
        engine_requested: engineRequested,
        engine_used: engineRequested,
        finance_budget_status: budget?.status || "unknown",
      }
    );
  }

  let byokRouting;
  try {
    byokRouting = await resolveMarketingAuthContext({
      user_id: options.user_id || null,
      use_user_key: options.use_user_key === true,
      engine_tier: preTagTier,
    });
  } catch (err) {
    if (err?.code === "DECRYPTION_FAILED" || err?.message === "DECRYPTION_FAILED") {
      return errorResponse(
        "DECRYPTION_FAILED",
        {
          node: "sales_content_pipeline",
          code: "DECRYPTION_FAILED",
          latency_ms: latency(),
        },
        attachRawProductDataToPipelineData(
          {
            stage: "byok_decrypt",
            aborted: true,
          },
          options
        )
      );
    }
    throw err;
  }

  if (byokRouting.should_charge_credits) {
    const debit = await reserveAiSpendAtomic(options.user_id || null, adjustedCostEst, {
      pipeline_job_id: options.pipeline_job_id || null,
      stage: "pre_ai_debit",
      requested_engine_tier: preTagTier,
    });
    if (!debit.ok) {
      return errorResponse(
        `BALANCE_DEBIT_FAILED: ${debit.reason || "unknown"}`,
        {
          node: "sales_content_pipeline",
          code: "BALANCE_DEBIT_FAILED",
          cost_est: adjustedCostEst,
          latency_ms: latency(),
        },
        attachRawProductDataToPipelineData(
          {
            stage: "wallet_debit",
            aborted: true,
            debit,
          },
          options
        )
      );
    }
  }

  const tagResult = await callTagCenter(
    options.tagCenter || { method: "GET", query: "?limit=1" }
  );

  const built = buildTagPayload(tagResult);
  const tagPayload = built.data;
  const explicitStrategyContext = built.strategyContext;
  const gracefulDegradation = built.degraded ? ["tag-center"] : [];
  const engineRequested = resolveRequestedEngineTier(options, tagPayload);

  if (shouldSimulateAsyncMarketing(options)) {
    const jobId = randomUUID();
    jobStore.createJob({
      id: jobId,
      kind: "sales_content_marketing_async",
      payload: {
        cost_est: adjustedCostEst,
        max_budget: maxBudget,
        strategyContext: explicitStrategyContext || tagPayload?.strategyContext,
      },
    });

    setImmediate(async () => {
      try {
        const mktResult = await callMarketingWithAutoFallback(options, engineRequested, byokRouting);
        jobStore.updateJob(jobId, {
          status: mktResult.ok ? "completed" : "failed",
          result: mktResult.ok
            ? {
                success: true,
                data: { marketing: mktResult.data },
                metadata: {
                  node: "sales_content_pipeline",
                  cost_est: adjustedCostEst,
                  latency_ms: 0,
                  engine_requested: mktResult.engine_requested,
                  engine_used: mktResult.engine_used,
                  video_enrichment: mktResult.video_enrichment,
                },
                error: null,
              }
            : null,
          error: mktResult.ok ? null : mktResult.error || "marketing_request_failed",
        });

        if (mktResult.ok) {
          if (!options.skip_finance_report && byokRouting.should_charge_credits) {
            try {
              await reportCampaignCost(options.user_id || null, options.draft_id || null, adjustedCostEst);
            } catch (e) {
              console.warn("[sales_content_pipeline] finance report failed (async):", e?.message || String(e));
            }
          }
          scheduleDispatchMakeWebhook({
            jobId,
            options,
            explicitStrategyContext,
            tagPayload,
            marketingData: mktResult.data,
          });
        }
      } catch (err) {
        jobStore.updateJob(jobId, {
          status: "failed",
          error: err.message || String(err),
        });
      }
    });

    return successResponse(
      attachRawProductDataToPipelineData(
        {
          job_id: jobId,
          status: "processing",
          stages: ["preflight", "tag_center", "marketing_queued"],
          tag_center: tagPayload,
          strategyContext: explicitStrategyContext || tagPayload?.strategyContext || DEFAULT_STRATEGY_CONTEXT,
          marketing: { pending: true, note: "Simulated async: poll job_id for result" },
          graceful_degradation: gracefulDegradation,
          degraded: gracefulDegradation.length > 0,
        },
        options
      ),
      {
        node: "sales_content_pipeline",
        cost_est: adjustedCostEst,
        latency_ms: latency(),
        max_budget: maxBudget,
        preflight_breakdown: preflightBreakdown,
        async_marketing: true,
        engine_requested: engineRequested,
        engine_used: engineRequested,
        ai_auth_mode: byokRouting.auth_mode,
        ai_provider: byokRouting.provider || null,
        billing_mode: byokRouting.should_charge_credits ? "platform_credits" : "byok",
      }
    );
  }

  const mktResult = await callMarketingWithAutoFallback(options, engineRequested, byokRouting);
  if (!mktResult.ok) {
    return errorResponse(
      mktResult.error || "marketing_request_failed",
      {
        node: "sales_content_pipeline",
        cost_est: adjustedCostEst,
        latency_ms: latency(),
        preflight_ok: true,
        downstream: "marketing",
        graceful_degradation: gracefulDegradation,
        engine_requested: mktResult.engine_requested,
        engine_used: mktResult.engine_used,
        video_enrichment: mktResult.video_enrichment,
      },
      attachRawProductDataToPipelineData(
        {
          tag_center: tagPayload,
          strategyContext: explicitStrategyContext || tagPayload?.strategyContext,
          marketing: mktResult.data,
          tag_center_status: tagResult.ok ? tagResult.status : "degraded",
          marketing_status: mktResult.status,
        },
        options
      )
    );
  }

  scheduleDispatchMakeWebhook({
    jobId: options.pipeline_job_id || null,
    options,
    explicitStrategyContext,
    tagPayload,
    marketingData: mktResult.data,
  });

  if (!options.skip_finance_report && byokRouting.should_charge_credits) {
    try {
      await reportCampaignCost(options.user_id || null, options.draft_id || null, adjustedCostEst);
    } catch (e) {
      console.warn("[sales_content_pipeline] finance report failed:", e?.message || String(e));
    }
  }

  return successResponse(
    attachRawProductDataToPipelineData(
      {
        stages: ["preflight", "tag_center", "marketing"],
        tag_center: tagPayload,
        strategyContext: explicitStrategyContext || tagPayload?.strategyContext,
        marketing: mktResult.data,
        graceful_degradation: gracefulDegradation,
        degraded: gracefulDegradation.length > 0,
      },
      options
    ),
    {
      node: "sales_content_pipeline",
      cost_est: adjustedCostEst,
      latency_ms: latency(),
      max_budget: maxBudget,
      preflight_breakdown: preflightBreakdown,
      engine_requested: mktResult.engine_requested,
      engine_used: mktResult.engine_used,
      video_enrichment: mktResult.video_enrichment,
      finance_budget_status: budget?.status || "unknown",
      finance_max_budget: Number.isFinite(Number(budget?.max_budget)) ? Number(budget.max_budget) : null,
      finance_currency: budget?.currency || "USD",
      ai_auth_mode: byokRouting.auth_mode,
      ai_provider: byokRouting.provider || null,
      billing_mode: byokRouting.should_charge_credits ? "platform_credits" : "byok",
    }
  );
}

/**
 * Deferred execution: returns job_id + processing immediately; runs pipeline in background.
 */
async function submitDeferredFullCircle(options = {}) {
  const t0 = Date.now();
  const job = jobStore.createJob({
    kind: "sales_content_pipeline",
    payload: {
      max_budget: options.max_budget,
      estimatedDurationSec: options.estimatedDurationSec,
    },
  });

  setImmediate(async () => {
    try {
      const result = await executeFullCircle(options);
      jobStore.updateJob(job.id, {
        status: result.success ? "completed" : "failed",
        result,
        error: result.success ? null : result.error,
      });
    } catch (err) {
      jobStore.updateJob(job.id, {
        status: "failed",
        error: err.message || String(err),
      });
    }
  });

  return successResponse(
    {
      job_id: job.id,
      status: "processing",
    },
    {
      node: "sales_content_pipeline",
      cost_est: 0,
      latency_ms: Date.now() - t0,
      async: true,
    }
  );
}

/**
 * Routes to async job when AI work is expected to exceed threshold, else synchronous pipeline.
 */
async function runPipelineWithAsyncPolicy(options = {}) {
  const est = Number(options.estimatedDurationSec);
  const forceAsync = options.async === true || options.forceAsync === true;
  if (forceAsync || (Number.isFinite(est) && est > AI_ASYNC_THRESHOLD_SEC)) {
    return submitDeferredFullCircle(options);
  }
  return executeFullCircle(options);
}

function getPipelineJobStatus(jobId) {
  return jobStore.getJobEnvelope(jobId);
}

module.exports = {
  executeFullCircle,
  runPipelineWithAsyncPolicy,
  submitDeferredFullCircle,
  runPreFlightCreditEstimate,
  getPipelineJobStatus,
  DEFAULT_STRATEGY,
  DEFAULT_STRATEGY_CONTEXT,
  DEFAULT_MAX_BUDGET,
  DEFAULT_PREFLIGHT,
  AI_ASYNC_THRESHOLD_SEC,
  shouldSimulateAsyncMarketing,
  isDryRun,
};
