/**
 * Núcleo compartido: una venta simulada sobre un borrador `published`.
 * Usado por `simulate_sales.js` (CLI) y `background_sales_worker.js` (DEMO_MODE).
 */
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const { calculateCommissionSplit } = require(path.join(
  __dirname,
  "../modules/fifer-platform/finance-bridge/finance_client.js"
));

const FINANCE = "fifer_finance";
const PLATFORM = "fifer_platform";

function getServiceSupabase() {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function pickRandom(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Clave estable para ranking por plataforma (metadata.platform).
 * @param {{ metadata?: Record<string, unknown>, source_url?: string | null }} draft
 */
function inferAffiliatePlatformKey(draft) {
  const meta = draft.metadata && typeof draft.metadata === "object" ? draft.metadata : {};
  const ss = String(meta.source_store || meta.affiliate_platform || "")
    .toLowerCase()
    .trim();
  if (ss) {
    if (ss.includes("tiktok")) return "tiktok";
    if (ss.includes("instagram")) return "instagram";
    if (ss.includes("facebook") || ss.includes("meta")) return "facebook";
    if (ss.includes("youtube")) return "youtube";
    if (ss.includes("shopify")) return "shopify";
    if (ss.includes("amazon")) return "amazon";
    if (ss.includes("mercadolibre") || ss.includes("mercadolivre") || ss.includes("meli"))
      return "mercadolibre";
    if (ss.includes("aliexpress")) return "aliexpress";
    const slug = ss.replace(/\s+/g, "_").slice(0, 48);
    return slug || "other";
  }
  const raw = String(draft.source_url || "").trim();
  if (!raw) return "other";
  try {
    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("facebook") || host.includes("fb.")) return "facebook";
    if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
    if (host.includes("shopify") || host.includes("myshopify")) return "shopify";
    if (host.includes("amazon")) return "amazon";
    if (host.includes("mercadolibre") || host.includes("mercadolivre")) return "mercadolibre";
    if (host.includes("aliexpress")) return "aliexpress";
  } catch {
    /* ignore */
  }
  return "other";
}

function extractProductEconomics(draft) {
  const meta = draft.metadata && typeof draft.metadata === "object" ? draft.metadata : {};
  const content = draft.content_data && typeof draft.content_data === "object" ? draft.content_data : {};
  const raw =
    meta.raw_product_snapshot && typeof meta.raw_product_snapshot === "object"
      ? meta.raw_product_snapshot
      : {};

  let price_usd = Number(meta.price_usd ?? raw.price_usd ?? content.price_usd ?? meta.scraped_price_usd);
  if (!Number.isFinite(price_usd) || price_usd < 0) price_usd = 49.99;

  let commission_rate = Number(
    meta.commission_rate ?? raw.commission_rate ?? content.commission_rate ?? 0.12
  );
  if (!Number.isFinite(commission_rate) || commission_rate < 0) commission_rate = 0.12;
  if (commission_rate > 1) commission_rate = commission_rate / 100;

  const gross_commission = Number((price_usd * commission_rate).toFixed(6));
  return { price_usd, commission_rate, gross_commission };
}

async function ensureWallet(supabase, userId) {
  const { data: existing } = await supabase
    .schema(FINANCE)
    .from("wallets")
    .select("id, balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.id) return existing;

  const { data: inserted, error } = await supabase
    .schema(FINANCE)
    .from("wallets")
    .insert({ user_id: userId, balance: 0 })
    .select("id, balance")
    .single();

  if (error) {
    throw new Error(`wallet_insert: ${error.message}`);
  }
  return inserted;
}

/**
 * @param {{ supabase?: import("@supabase/supabase-js").SupabaseClient, demoAuto?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, draft_id?: string, user_share?: number, skipped?: boolean, reason?: string, error?: string }>}
 */
async function simulateOnePublishedSale(options = {}) {
  const supabase = options.supabase || getServiceSupabase();
  if (!supabase) {
    return { ok: false, reason: "supabase_not_configured" };
  }

  const { data: published, error: qErr } = await supabase
    .schema(PLATFORM)
    .from("campaign_drafts")
    .select("id, user_id, metadata, content_data, source_url")
    .eq("status", "published");

  if (qErr) {
    return { ok: false, error: qErr.message || String(qErr), reason: "query_failed" };
  }

  if (!published?.length) {
    return { ok: false, skipped: true, reason: "no_published_campaigns" };
  }

  const draft = pickRandom(published);
  const { price_usd, commission_rate, gross_commission } = extractProductEconomics(draft);
  const platformKey = inferAffiliatePlatformKey(draft);
  const userId = String(draft.user_id);

  if (gross_commission <= 0) {
    return { ok: false, skipped: true, reason: "zero_commission", draft_id: draft.id };
  }

  const split = await calculateCommissionSplit(gross_commission, userId);
  const wallet = await ensureWallet(supabase, userId);
  const newBalance = Number(wallet.balance || 0) + split.user_share;

  const { error: wErr } = await supabase
    .schema(FINANCE)
    .from("wallets")
    .update({ balance: newBalance })
    .eq("id", wallet.id);

  if (wErr) {
    return { ok: false, error: wErr.message, reason: "wallet_update_failed" };
  }

  const txMeta = {
    draft_id: draft.id,
    simulated_sale: true,
    demo_auto: Boolean(options.demoAuto),
    gross_commission,
    user_share: split.user_share,
    platform_share: split.platform_share,
    price_usd,
    commission_rate,
  };

  const { error: tErr } = await supabase.schema(FINANCE).from("transactions").insert({
    wallet_id: wallet.id,
    amount: split.user_share,
    type: "referral_earn",
    metadata: txMeta,
  });

  if (tErr) {
    return { ok: false, error: tErr.message, reason: "transaction_insert_failed" };
  }

  const { error: lErr } = await supabase.schema(FINANCE).from("ledger").insert({
    user_id: userId,
    type: "sale_commission",
    amount: split.user_share,
    currency: "USD",
    status: "posted",
    metadata: {
      draft_id: draft.id,
      platform: platformKey,
      kind: options.demoAuto ? "demo_auto_sale" : "simulated_affiliate_sale",
      gross_commission,
      platform_share: split.platform_share,
      user_share: split.user_share,
      price_usd,
      commission_rate,
      split_source: split.source,
    },
  });

  if (lErr) {
    return { ok: false, error: lErr.message, reason: "ledger_insert_failed" };
  }

  const { error: pErr } = await supabase.schema(FINANCE).from("platform_revenue").insert({
    campaign_draft_id: draft.id,
    user_id: userId,
    gross_commission: gross_commission,
    platform_share: split.platform_share,
    user_share: split.user_share,
    currency: "USD",
    metadata: {
      simulated_sale: true,
      demo_auto: Boolean(options.demoAuto),
      price_usd,
      commission_rate,
    },
  });

  if (pErr) {
    return { ok: false, error: pErr.message, reason: "platform_revenue_insert_failed" };
  }

  return {
    ok: true,
    draft_id: draft.id,
    user_id: userId,
    user_share: split.user_share,
    platform_share: split.platform_share,
    gross_commission,
    new_balance: newBalance,
  };
}

module.exports = {
  simulateOnePublishedSale,
  getServiceSupabase,
  FINANCE,
  PLATFORM,
};
