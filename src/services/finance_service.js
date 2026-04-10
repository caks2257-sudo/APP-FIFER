/**
 * Servicios financieros FIFER — ROI por campaña, agregados desde ledger.
 * Financial Bunker / ledger: `fifer_finance.ledger`, wallets, transacciones.
 */
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { getDraftById } = require(path.join(
  __dirname,
  "../modules/fifer-platform/campaigns/draftRepository.js"
));

const FINANCE = "fifer_finance";
const PLATFORM = "fifer_platform";

let _client = null;

function getServiceClient() {
  if (_client) return _client;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

function metaDraftId(row) {
  const m = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return m.draft_id != null ? String(m.draft_id) : "";
}

/**
 * ROI = ((Ganancia usuario − Costo IA) / Costo IA) × 100
 * Ganancia: suma ledger `referral_earn` y `sale_commission` con metadata.draft_id (comisiones simuladas/reales).
 * Costo IA: suma ledger `ai_spend` + transacciones wallet `ai_spend` con metadata.draft_id.
 *
 * @param {string} draftId
 * @returns {Promise<{ draft_id: string, user_gain_usd: number, ai_cost_usd: number, roi_percent: number | null, note?: string } | null>}
 */
async function calculateCampaignROI(draftId) {
  const id = String(draftId || "").trim();
  if (!id) return null;

  const draft = await getDraftById(id);
  if (!draft) return null;

  const uid = String(draft.user_id || "").trim();
  const supabase = getServiceClient();
  if (!supabase) {
    return {
      draft_id: id,
      user_gain_usd: 0,
      ai_cost_usd: 0,
      roi_percent: null,
      note: "supabase_not_configured",
    };
  }

  const { data: ledgerRows, error: leErr } = await supabase
    .schema(FINANCE)
    .from("ledger")
    .select("type, amount, metadata")
    .eq("user_id", uid)
    .eq("status", "posted");

  if (leErr) {
    return {
      draft_id: id,
      user_gain_usd: 0,
      ai_cost_usd: 0,
      roi_percent: null,
      note: leErr.message || "ledger_query_failed",
    };
  }

  let userGain = 0;
  let aiCostLedger = 0;
  for (const row of ledgerRows || []) {
    if (metaDraftId(row) !== id) continue;
    const amt = Number(row.amount || 0);
    if (row.type === "referral_earn" || row.type === "sale_commission") userGain += Math.abs(amt);
    if (row.type === "ai_spend") aiCostLedger += Math.abs(amt);
  }

  const { data: wallet } = await supabase
    .schema(FINANCE)
    .from("wallets")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();

  let aiCostTx = 0;
  if (wallet?.id) {
    const { data: txs } = await supabase
      .schema(FINANCE)
      .from("transactions")
      .select("amount, type, metadata")
      .eq("wallet_id", wallet.id);

    for (const tx of txs || []) {
      if (String(tx.type || "") !== "ai_spend") continue;
      const m = tx.metadata && typeof tx.metadata === "object" ? tx.metadata : {};
      if (String(m.draft_id || "") !== id) continue;
      aiCostTx += Math.abs(Number(tx.amount || 0));
    }
  }

  const aiCost = aiCostLedger + aiCostTx;
  if (aiCost <= 0) {
    return {
      draft_id: id,
      user_gain_usd: Number(userGain.toFixed(6)),
      ai_cost_usd: 0,
      roi_percent: null,
      note: "no_ai_cost_for_draft",
    };
  }

  const roi = ((userGain - aiCost) / aiCost) * 100;
  return {
    draft_id: id,
    user_gain_usd: Number(userGain.toFixed(6)),
    ai_cost_usd: Number(aiCost.toFixed(6)),
    roi_percent: Number(roi.toFixed(2)),
  };
}

/**
 * Ingresos por semana (ISO week, lunes) desde ledger (`referral_earn` + `sale_commission`).
 * @param {string} userId
 * @param {number} weeks
 * @returns {Promise<{ label: string, week_start: string, amount_usd: number }[]>}
 */
async function getWeeklyIncomeFromLedger(userId, weeks = 8) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const supabase = getServiceClient();
  if (!supabase) return [];

  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .schema(FINANCE)
    .from("ledger")
    .select("amount, created_at, type")
    .eq("user_id", uid)
    .in("type", ["referral_earn", "sale_commission"])
    .eq("status", "posted")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error || !data?.length) return [];

  const buckets = new Map();
  for (const row of data) {
    const d = new Date(row.created_at);
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);
    const key = monday.toISOString().slice(0, 10);
    const amt = Math.abs(Number(row.amount || 0));
    buckets.set(key, (buckets.get(key) || 0) + amt);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, amount_usd]) => ({
      week_start: weekStart,
      label: weekStart,
      amount_usd: Number(amount_usd.toFixed(6)),
    }));
}

/**
 * Últimas entradas de ledger (para polling / toasts).
 * @param {string} userId
 * @param {number} limit
 */
async function getRecentLedgerEntries(userId, limit = 10) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .schema(FINANCE)
    .from("ledger")
    .select("id, type, amount, currency, metadata, created_at")
    .eq("user_id", uid)
    .eq("status", "posted")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    type: r.type,
    amount: Number(r.amount || 0),
    currency: r.currency || "USD",
    metadata: r.metadata && typeof r.metadata === "object" ? r.metadata : {},
    created_at: r.created_at,
  }));
}

/**
 * ROI resumido para borradores publicados del usuario (máx. N).
 * @param {string} userId
 * @param {number} maxDrafts
 */
async function getRoiForUserPublishedDrafts(userId, maxDrafts = 15) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data: drafts, error } = await supabase
    .schema(PLATFORM)
    .from("campaign_drafts")
    .select("id")
    .eq("user_id", uid)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(maxDrafts);

  if (error || !drafts?.length) return [];

  const out = [];
  for (const d of drafts) {
    const roi = await calculateCampaignROI(d.id);
    if (roi) out.push(roi);
  }
  return out;
}

const PLATFORM_DISPLAY = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  shopify: "Shopify",
  amazon: "Amazon",
  mercadolibre: "Mercado Libre",
  aliexpress: "AliExpress",
  other: "Otras",
  unknown: "Sin clasificar",
};

function platformDisplayName(key) {
  const k = String(key || "unknown").toLowerCase().trim() || "unknown";
  if (PLATFORM_DISPLAY[k]) return PLATFORM_DISPLAY[k];
  return k
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function aggregateLedgerByPlatform(rows) {
  const byPlatform = new Map();
  for (const row of rows || []) {
    const m = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    const p =
      String(m.platform || m.source_store || "unknown")
        .toLowerCase()
        .trim() || "unknown";
    const amt = Math.abs(Number(row.amount || 0));
    byPlatform.set(p, (byPlatform.get(p) || 0) + amt);
  }
  return Array.from(byPlatform.entries())
    .map(([platform_key, total_usd]) => ({
      platform_key,
      total_usd: Number(total_usd.toFixed(6)),
    }))
    .sort((a, b) => b.total_usd - a.total_usd);
}

function rankByPlatform(sorted) {
  const m = new Map();
  sorted.forEach((row, i) => m.set(row.platform_key, i + 1));
  return m;
}

/**
 * Ranking semanal (7 días) de plataformas por suma de `sale_commission` en ledger.
 * Tendencia: compara posición vs ventana anterior (días 8–14).
 *
 * @param {string} userId
 * @returns {Promise<{ ranking: { rank: number, platform_key: string, display_name: string, total_usd: number, trend_up: boolean, previous_rank: number | null }[], window_days: number }>}
 */
async function getPlatformProfitRanking(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return { ranking: [], window_days: 7 };

  const supabase = getServiceClient();
  if (!supabase) {
    return { ranking: [], window_days: 7, note: "supabase_not_configured" };
  }

  const now = new Date();
  const t7 = new Date(now);
  t7.setDate(t7.getDate() - 7);
  const t14 = new Date(now);
  t14.setDate(t14.getDate() - 14);

  const { data: curRows, error: e1 } = await supabase
    .schema(FINANCE)
    .from("ledger")
    .select("amount, metadata, created_at")
    .eq("user_id", uid)
    .eq("type", "sale_commission")
    .eq("status", "posted")
    .gte("created_at", t7.toISOString());

  const { data: prevRows, error: e2 } = await supabase
    .schema(FINANCE)
    .from("ledger")
    .select("amount, metadata, created_at")
    .eq("user_id", uid)
    .eq("type", "sale_commission")
    .eq("status", "posted")
    .gte("created_at", t14.toISOString())
    .lt("created_at", t7.toISOString());

  if (e1) {
    return { ranking: [], window_days: 7, note: e1.message || "ledger_query_failed" };
  }

  const curSorted = aggregateLedgerByPlatform(curRows);
  const prevSorted = e2 ? [] : aggregateLedgerByPlatform(prevRows || []);
  const prevRanks = rankByPlatform(prevSorted);

  const top5 = curSorted.slice(0, 5);
  const ranking = top5.map((row, i) => {
    const curRank = i + 1;
    const prevRank = prevRanks.has(row.platform_key) ? prevRanks.get(row.platform_key) : null;
    const trend_up = prevRank != null && prevRank > curRank;
    return {
      rank: curRank,
      platform_key: row.platform_key,
      display_name: platformDisplayName(row.platform_key),
      total_usd: row.total_usd,
      trend_up,
      previous_rank: prevRank,
    };
  });

  return { ranking, window_days: 7 };
}

/**
 * Registro manual de ingreso MVP (transaccional ligero):
 * - Inserta transacción `referral_earn`
 * - Actualiza balance de wallet
 */
async function registerManualIncome(userId, amount, note = "") {
  const uid = String(userId || "").trim();
  const amt = Number(amount);
  if (!uid) return { ok: false, error: "missing_user_id" };
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: "invalid_amount" };

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  const { data: wallet, error: walletErr } = await supabase
    .schema(FINANCE)
    .from("wallets")
    .select("id,balance")
    .eq("user_id", uid)
    .maybeSingle();
  if (walletErr || !wallet?.id) {
    return { ok: false, error: walletErr?.message || "wallet_not_found" };
  }

  const metadata = {
    source_store: "manual",
    note: String(note || "").trim() || null,
  };
  const { error: txErr } = await supabase
    .schema(FINANCE)
    .from("transactions")
    .insert({
      wallet_id: wallet.id,
      amount: amt,
      type: "referral_earn",
      metadata,
    });
  if (txErr) return { ok: false, error: txErr.message || "transaction_insert_failed" };

  const nextBalance = Number(wallet.balance || 0) + amt;
  const { error: upErr } = await supabase
    .schema(FINANCE)
    .from("wallets")
    .update({ balance: nextBalance })
    .eq("id", wallet.id);
  if (upErr) return { ok: false, error: upErr.message || "wallet_update_failed" };

  return { ok: true, amount: amt, balance: Number(nextBalance.toFixed(6)) };
}

module.exports = {
  getServiceClient,
  calculateCampaignROI,
  getWeeklyIncomeFromLedger,
  getRecentLedgerEntries,
  getRoiForUserPublishedDrafts,
  getPlatformProfitRanking,
  registerManualIncome,
};
