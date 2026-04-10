const AUTH_SCHEMA = "fifer_auth";
const FINANCE_SCHEMA = "fifer_finance";
const REFINING_DELAY_MS = 1500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch (_err) {
    return {};
  }
}

class FinanceGatewayMock {
  constructor() {
    this._supabase = null;
  }

  static isEnabled() {
    return String(process.env.USE_FINANCE_MOCK || "")
      .trim()
      .toLowerCase() === "true";
  }

  async createSubscription(input = {}) {
    await this._simulateRefining(input.onStateChange);

    const userId = String(input.userId || input.client_reference_id || "").trim();
    const upsert = await this._upsertProSubscription(userId, {
      source: "finance_gateway_mock",
      provider: String(input.provider || "stripe").toLowerCase(),
      price_id: input.priceId || null,
    });

    return {
      success: upsert.ok,
      provider: "finance-mock",
      gateway: "finance-mock",
      status: upsert.ok ? "active" : "error",
      payment_status: upsert.ok ? "paid" : "failed",
      subscription_tier: upsert.ok ? "pro" : "free",
      isRefining: false,
      refining_delay_ms: REFINING_DELAY_MS,
      user_id: userId || null,
      db: upsert,
    };
  }

  async handleWebhook(input = {}) {
    await this._simulateRefining(input.onStateChange);

    const payload = safeJsonParse(input.payload);
    const userId = String(
      input.userId ||
        input.client_reference_id ||
        payload?.client_reference_id ||
        payload?.data?.object?.client_reference_id ||
        payload?.user_id ||
        ""
    ).trim();

    const upsert = await this._upsertProSubscription(userId, {
      source: "finance_gateway_mock_webhook",
      provider: String(input.provider || "stripe").toLowerCase(),
      event_type: input.eventType || payload?.type || "checkout.session.completed",
    });

    return {
      received: true,
      mocked: true,
      provider: String(input.provider || "stripe").toLowerCase(),
      type: input.eventType || payload?.type || "checkout.session.completed",
      user_id: upsert.user_id || userId || null,
      tier: upsert.ok ? "pro" : "free",
      subscription_tier: upsert.ok ? "pro" : "free",
      isRefining: false,
      refining_delay_ms: REFINING_DELAY_MS,
      db: upsert,
    };
  }

  async getPaymentStatus(input = {}) {
    await this._simulateRefining(input.onStateChange);

    return {
      success: true,
      mocked: true,
      gateway: "finance-mock",
      payment_id: input.paymentId || input.payment_id || null,
      status: "paid",
      subscription_tier: "pro",
      isRefining: false,
      refining_delay_ms: REFINING_DELAY_MS,
    };
  }

  async _simulateRefining(onStateChange) {
    if (typeof onStateChange === "function") {
      await onStateChange({ isRefining: true, source: "finance_gateway_mock" });
    }
    await delay(REFINING_DELAY_MS);
    if (typeof onStateChange === "function") {
      await onStateChange({ isRefining: false, source: "finance_gateway_mock" });
    }
  }

  _getServiceSupabase() {
    if (this._supabase) return this._supabase;

    const url = String(process.env.SUPABASE_URL || "").trim();
    const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url || !key) return null;

    try {
      const { createClient } = require("@supabase/supabase-js");
      this._supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return this._supabase;
    } catch (_err) {
      return null;
    }
  }

  async _upsertProSubscription(userId, metadata = {}) {
    const normalizedUserId = String(userId || "").trim();
    if (!normalizedUserId) {
      return { ok: false, error: "missing_user_id", user_id: null };
    }

    const supabase = this._getServiceSupabase();
    if (!supabase) {
      return { ok: false, error: "supabase_not_configured", user_id: normalizedUserId };
    }

    const now = new Date().toISOString();
    const { error: profileError } = await supabase
      .schema(AUTH_SCHEMA)
      .from("user_profile")
      .upsert(
        {
          user_id: normalizedUserId,
          subscription_tier: "pro",
          tier_expires_at: null,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      return {
        ok: false,
        error: profileError.message || String(profileError),
        user_id: normalizedUserId,
      };
    }

    await supabase.schema(FINANCE_SCHEMA).from("ledger").insert({
      user_id: normalizedUserId,
      type: "subscription_revenue",
      amount: 0,
      currency: "USD",
      status: "posted",
      metadata: {
        source: "finance_gateway_mock",
        ...metadata,
      },
    });

    return { ok: true, user_id: normalizedUserId, subscription_tier: "pro" };
  }
}

module.exports = {
  FinanceGatewayMock,
  REFINING_DELAY_MS,
};
