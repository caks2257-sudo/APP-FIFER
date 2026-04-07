const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8000;
const API_BASE_URL = String(process.env.CURRENCY_API_BASE_URL || "https://api.frankfurter.app").trim();

// Emergency fallback rates (1 USD = X currency). We convert inverse for X -> USD.
const USD_BASE_FALLBACK = {
  USD: 1,
  CLP: 950,
  ARS: 1100,
  BRL: 5.2,
};

let _supabase = null;
let _warnedNoSupabase = false;
const memCache = new Map();

function getSupabaseServiceClient() {
  if (_supabase) return _supabase;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabase;
}

function normalizeCurrency(code) {
  return String(code || "USD").trim().toUpperCase();
}

function parseNumeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fallbackRateToUSD(fromCurrency) {
  const c = normalizeCurrency(fromCurrency);
  const unitsPerUsd = USD_BASE_FALLBACK[c];
  if (!unitsPerUsd || !Number.isFinite(unitsPerUsd) || unitsPerUsd <= 0) return null;
  return 1 / unitsPerUsd;
}

function buildCacheKey(base, target) {
  return `${normalizeCurrency(base)}->${normalizeCurrency(target)}`;
}

async function getDbCachedRate(baseCurrency, targetCurrency) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    if (!_warnedNoSupabase) {
      _warnedNoSupabase = true;
      console.warn("[currency_service] WARN: Supabase no configurado; usando caché memoria/fallback.");
    }
    return null;
  }
  try {
    const { data, error } = await supabase
      .schema("fifer_finance")
      .from("exchange_rates")
      .select("rate,fetched_at")
      .eq("base_currency", normalizeCurrency(baseCurrency))
      .eq("target_currency", normalizeCurrency(targetCurrency))
      .maybeSingle();
    if (error || !data) return null;
    const rate = parseNumeric(data.rate);
    if (rate == null || rate <= 0) return null;
    const fetchedAt = new Date(data.fetched_at || 0).getTime();
    if (!Number.isFinite(fetchedAt) || Date.now() - fetchedAt > CACHE_TTL_MS) return null;
    return { rate, source: "supabase_cache", fetched_at: data.fetched_at };
  } catch {
    return null;
  }
}

async function saveDbRate(baseCurrency, targetCurrency, rate) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return;
  try {
    await supabase
      .schema("fifer_finance")
      .from("exchange_rates")
      .upsert(
        {
          base_currency: normalizeCurrency(baseCurrency),
          target_currency: normalizeCurrency(targetCurrency),
          rate,
          fetched_at: new Date().toISOString(),
          source: "frankfurter",
        },
        { onConflict: "base_currency,target_currency" }
      );
  } catch {
    // non-blocking
  }
}

async function fetchLiveRate(baseCurrency, targetCurrency) {
  const base = normalizeCurrency(baseCurrency);
  const target = normalizeCurrency(targetCurrency);
  const timeout = Number(process.env.CURRENCY_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const url = `${API_BASE_URL}/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(target)}`;
  const res = await axios.get(url, { timeout, validateStatus: () => true });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`currency api HTTP ${res.status}`);
  }
  const rate = parseNumeric(res.data?.rates?.[target]);
  if (rate == null || rate <= 0) {
    throw new Error("currency api invalid_rate");
  }
  return rate;
}

async function getRate(baseCurrency, targetCurrency = "USD") {
  const base = normalizeCurrency(baseCurrency);
  const target = normalizeCurrency(targetCurrency);
  if (base === target) return { rate: 1, source: "identity" };

  const memKey = buildCacheKey(base, target);
  const memHit = memCache.get(memKey);
  if (memHit && Date.now() - memHit.ts < CACHE_TTL_MS) {
    return { rate: memHit.rate, source: "memory_cache" };
  }

  const dbHit = await getDbCachedRate(base, target);
  if (dbHit && dbHit.rate > 0) {
    memCache.set(memKey, { rate: dbHit.rate, ts: Date.now() });
    return { rate: dbHit.rate, source: dbHit.source };
  }

  try {
    const rate = await fetchLiveRate(base, target);
    memCache.set(memKey, { rate, ts: Date.now() });
    await saveDbRate(base, target, rate);
    return { rate, source: "live_api" };
  } catch (err) {
    const fallback = fallbackRateToUSD(base);
    if (fallback && target === "USD") {
      console.warn(
        `[currency_service] WARN: fallback hardcoded ${base}->${target} por fallo API: ${err?.message || err}`
      );
      memCache.set(memKey, { rate: fallback, ts: Date.now() });
      return { rate: fallback, source: "fallback_hardcoded" };
    }
    throw err;
  }
}

async function convertToUSD(amount, fromCurrency) {
  const value = parseNumeric(amount);
  if (value == null) return { amount_usd: null, rate: null, source: "invalid_amount" };
  const currency = normalizeCurrency(fromCurrency);
  if (currency === "USD") {
    return { amount_usd: Number(value.toFixed(6)), rate: 1, source: "identity" };
  }
  try {
    const { rate, source } = await getRate(currency, "USD");
    const amountUsd = Number((value * rate).toFixed(6));
    return { amount_usd: amountUsd, rate, source };
  } catch (err) {
    const fallback = fallbackRateToUSD(currency);
    if (fallback) {
      const amountUsd = Number((value * fallback).toFixed(6));
      return { amount_usd: amountUsd, rate: fallback, source: "fallback_hardcoded" };
    }
    return { amount_usd: null, rate: null, source: `failed:${err?.message || err}` };
  }
}

module.exports = {
  convertToUSD,
  getRate,
  normalizeCurrency,
};

