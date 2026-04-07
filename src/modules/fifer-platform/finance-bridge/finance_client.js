const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

let _mockModeLogged = false;
let _supabaseService = null;

function getSupabaseServiceClient() {
  if (_supabaseService) return _supabaseService;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  _supabaseService = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabaseService;
}

function getFinanceCoreBaseUrl() {
  return String(process.env.FINANCE_CORE_API_URL || "").trim();
}

function isMockMode() {
  return !getFinanceCoreBaseUrl();
}

function logMockModeOnce() {
  if (_mockModeLogged) return;
  _mockModeLogged = true;
  console.log("💰 Finance Bridge: Modo Mock (API URL no configurada)");
}

function parseRate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function getUserCommissionConfig(userId) {
  const user = String(userId || "").trim();
  if (!user) return null;

  const envRaw = String(process.env.FINANCE_USER_SPLIT_OVERRIDES_JSON || "").trim();
  if (envRaw) {
    try {
      const parsed = JSON.parse(envRaw);
      const hit = parsed && typeof parsed === "object" ? parsed[user] : null;
      if (hit && typeof hit === "object") {
        const platformRate = parseRate(hit.platform_rate);
        const userRate = parseRate(hit.user_rate);
        if (platformRate != null && userRate != null && platformRate >= 0 && userRate >= 0) {
          return { platform_rate: platformRate, user_rate: userRate, source: "env_override" };
        }
      }
    } catch {
      // ignore malformed override
    }
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .schema("fifer_finance")
      .from("user_commission_configs")
      .select("platform_rate,user_rate")
      .eq("user_id", user)
      .maybeSingle();
    if (error || !data) return null;
    const platformRate = parseRate(data.platform_rate);
    const userRate = parseRate(data.user_rate);
    if (platformRate == null || userRate == null) return null;
    return { platform_rate: platformRate, user_rate: userRate, source: "table_override" };
  } catch {
    // table might not exist yet; fallback default
    return null;
  }
}

async function calculateCommissionSplit(apiCommission, userId = null) {
  const commission = Number(apiCommission);
  const safeCommission = Number.isFinite(commission) ? Math.max(0, commission) : 0;
  const override = await getUserCommissionConfig(userId);
  const platformRate = override ? override.platform_rate : 0.25;
  const userRate = override ? override.user_rate : 0.75;

  return {
    api_commission: safeCommission,
    platform_rate: platformRate,
    user_rate: userRate,
    platform_share: Number((safeCommission * platformRate).toFixed(6)),
    user_share: Number((safeCommission * userRate).toFixed(6)),
    source: override ? override.source : "default_75_25",
  };
}

async function reserveAiSpendAtomic(userId, amount, metadata = {}) {
  const uid = String(userId || "").trim();
  const spend = Number(amount);
  if (!uid) {
    return { ok: false, reason: "missing_user_id" };
  }
  if (!Number.isFinite(spend) || spend <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, reason: "supabase_not_configured" };
  }

  try {
    const { data, error } = await supabase.rpc("finance_apply_ai_spend", {
      p_user_id: uid,
      p_amount: spend,
      p_metadata: metadata,
    });
    if (error) {
      return { ok: false, reason: error.message || "rpc_error" };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.ok !== true) {
      return {
        ok: false,
        reason: row?.reason || "debit_failed",
        wallet_id: row?.wallet_id || null,
        new_balance: row?.new_balance ?? null,
      };
    }
    return {
      ok: true,
      reason: row.reason || "debited",
      wallet_id: row.wallet_id || null,
      new_balance: row.new_balance ?? null,
    };
  } catch (err) {
    return { ok: false, reason: err?.message || String(err) };
  }
}

async function getCampaignBudget(userId, campaignId) {
  if (isMockMode()) {
    logMockModeOnce();
    return { status: "approved", max_budget: 15.0, currency: "USD" };
  }

  const base = getFinanceCoreBaseUrl();
  try {
    const res = await axios.get(`${base}/api/v1/finance/campaign-budget`, {
      params: {
        user_id: userId || "",
        campaign_id: campaignId || "",
      },
      timeout: Number(process.env.FINANCE_CORE_TIMEOUT_MS || 10000),
      validateStatus: () => true,
    });
    if (res.status >= 200 && res.status < 300 && res.data) {
      return res.data;
    }
    console.warn(
      "[finance_client] budget endpoint non-2xx; usando fallback mock",
      res.status
    );
    return { status: "approved", max_budget: 15.0, currency: "USD" };
  } catch (err) {
    console.warn(
      "[finance_client] budget error; usando fallback mock:",
      err?.message || String(err)
    );
    return { status: "approved", max_budget: 15.0, currency: "USD" };
  }
}

async function reportCampaignCost(userId, draftId, totalCost) {
  const split = await calculateCommissionSplit(totalCost, userId);

  if (isMockMode()) {
    logMockModeOnce();
    return {
      success: true,
      mode: "mock",
      reported_cost: Number(totalCost) || 0,
      draft_id: draftId || null,
      user_id: userId || null,
      split,
    };
  }

  const base = getFinanceCoreBaseUrl();
  try {
    const res = await axios.post(
      `${base}/api/v1/finance/report-campaign-cost`,
      {
        user_id: userId || null,
        draft_id: draftId || null,
        total_cost: Number(totalCost) || 0,
        split,
      },
      {
        timeout: Number(process.env.FINANCE_CORE_TIMEOUT_MS || 10000),
        validateStatus: () => true,
      }
    );
    if (res.status >= 200 && res.status < 300) {
      return { success: true, mode: "remote", data: res.data || null };
    }
    return {
      success: false,
      mode: "remote",
      status: res.status,
      error: "finance_core_http_error",
    };
  } catch (err) {
    return {
      success: false,
      mode: "remote",
      error: err?.message || String(err),
    };
  }
}

async function getEarningsSummary(userId) {
  const uid = String(userId || "").trim();
  if (!uid) {
    return {
      success: false,
      error: "missing_user_id",
      data: {
        total_revenue: 0,
        available_balance: 0,
        ai_spend: 0,
        platform_breakdown: [],
        recent_transactions: [],
      },
    };
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return {
      success: true,
      mode: "mock",
      data: {
        total_revenue: 0,
        available_balance: 0,
        ai_spend: 0,
        platform_breakdown: [],
        recent_transactions: [],
      },
    };
  }

  try {
    const { data: wallet, error: walletErr } = await supabase
      .schema("fifer_finance")
      .from("wallets")
      .select("id,balance")
      .eq("user_id", uid)
      .maybeSingle();

    if (walletErr) {
      return {
        success: false,
        error: walletErr.message || "wallet_query_failed",
        data: {
          total_revenue: 0,
          available_balance: 0,
          ai_spend: 0,
          platform_breakdown: [],
          recent_transactions: [],
        },
      };
    }

    if (!wallet?.id) {
      return {
        success: true,
        data: {
          total_revenue: 0,
          available_balance: 0,
          ai_spend: 0,
          platform_breakdown: [],
          recent_transactions: [],
        },
      };
    }

    const { data: txs, error: txErr } = await supabase
      .schema("fifer_finance")
      .from("transactions")
      .select("id,amount,type,metadata,created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false });

    if (txErr) {
      return {
        success: false,
        error: txErr.message || "transactions_query_failed",
        data: {
          total_revenue: 0,
          available_balance: Number(wallet.balance || 0),
          ai_spend: 0,
          platform_breakdown: [],
          recent_transactions: [],
        },
      };
    }

    const rows = Array.isArray(txs) ? txs : [];
    const breakdown = new Map();
    let totalRevenue = 0;
    let aiSpend = 0;

    for (const tx of rows) {
      const amount = Number(tx?.amount || 0);
      const type = String(tx?.type || "").trim();
      const metadata = tx?.metadata && typeof tx.metadata === "object" ? tx.metadata : {};
      const sourceStore = String(metadata.source_store || "unknown").trim().toLowerCase();

      if (type === "ai_spend" || amount < 0) {
        aiSpend += Math.abs(amount);
      } else if (amount > 0) {
        totalRevenue += amount;
        const current = breakdown.get(sourceStore) || 0;
        breakdown.set(sourceStore, current + amount);
      }
    }

    const platform_breakdown = Array.from(breakdown.entries()).map(([platform, revenue]) => ({
      platform,
      revenue: Number(revenue.toFixed(6)),
    }));

    const recent_transactions = rows.slice(0, 20).map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount || 0),
      type: tx.type,
      source_store:
        tx?.metadata && typeof tx.metadata === "object" ? tx.metadata.source_store || "unknown" : "unknown",
      created_at: tx.created_at || null,
    }));

    return {
      success: true,
      data: {
        total_revenue: Number(totalRevenue.toFixed(6)),
        available_balance: Number(Number(wallet.balance || 0).toFixed(6)),
        ai_spend: Number(aiSpend.toFixed(6)),
        platform_breakdown,
        recent_transactions,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err?.message || String(err),
      data: {
        total_revenue: 0,
        available_balance: 0,
        ai_spend: 0,
        platform_breakdown: [],
        recent_transactions: [],
      },
    };
  }
}

module.exports = {
  getCampaignBudget,
  reportCampaignCost,
  getEarningsSummary,
  reserveAiSpendAtomic,
  calculateCommissionSplit,
  isMockMode,
};

