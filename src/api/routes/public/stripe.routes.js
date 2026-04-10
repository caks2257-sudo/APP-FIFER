/**
 * Stripe Revenue Engine — webhook con cuerpo RAW (firma HMAC).
 * Montaje: registrar `POST .../stripe/webhook` con `express.raw({ type: "application/json" })`
 * **antes** de `express.json()` en la app Express raíz (ver `src/api/http_server.js`).
 */
const path = require("path");
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { FinanceGatewayMock } = require(path.join(
  __dirname,
  "../../../../packages/engines/finance-engine/src/gateways/FinanceGatewayMock.js"
));

const AUTH_SCHEMA = "fifer_auth";
const FINANCE_SCHEMA = "fifer_finance";

let _stripe = null;
let _supabase = null;
const _financeMock = new FinanceGatewayMock();

function isFinanceMockEnabled() {
  return FinanceGatewayMock.isEnabled();
}

function getStripe() {
  if (_stripe) return _stripe;
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) return null;
  _stripe = new Stripe(key);
  return _stripe;
}

function getServiceSupabase() {
  if (_supabase) return _supabase;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabase;
}

/**
 * Resuelve UUID de usuario: prioridad `client_reference_id`, luego email (Auth Admin).
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @returns {Promise<string | null>}
 */
async function resolveUserIdFromSession(session) {
  const ref = session?.client_reference_id != null ? String(session.client_reference_id).trim() : "";
  if (ref && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref)) {
    return ref;
  }

  const emailRaw =
    session?.customer_details?.email ||
    session?.customer_email ||
    (typeof session?.customer === "string" ? null : session?.customer?.email) ||
    "";
  const email = String(emailRaw || "")
    .trim()
    .toLowerCase();
  if (!email) return null;

  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data?.users?.length) {
    console.warn("[stripe] resolveUserIdFromSession: listUsers failed or empty", error?.message || "");
    return null;
  }
  const u = data.users.find((x) => String(x.email || "").toLowerCase() === email);
  return u?.id ? String(u.id) : null;
}

/**
 * @param {string} userId
 * @param {import('stripe').Stripe.Event} event
 * @param {import('stripe').Stripe.Checkout.Session} session
 */
async function upsertProSubscription(userId, event, session) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .schema(AUTH_SCHEMA)
    .from("user_profile")
    .upsert(
      {
        user_id: userId,
        subscription_tier: "pro",
        tier_expires_at: null,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

  if (upErr) {
    return { ok: false, error: upErr.message || String(upErr) };
  }

  const amountCents = Number(session?.amount_total ?? session?.amount_subtotal ?? 0) || 0;
  const amountUsd = Math.round((amountCents / 100) * 1e6) / 1e6;
  const currency = String(session?.currency || "usd").toUpperCase();

  const { data: ledgerRows } = await supabase
    .schema(FINANCE_SCHEMA)
    .from("ledger")
    .select("id, metadata")
    .eq("user_id", userId)
    .eq("type", "subscription_revenue");

  const dup = (ledgerRows || []).find((row) => row?.metadata?.stripe_event_id === event.id);
  if (dup?.id) {
    return { ok: true, skipped_ledger: true, user_id: userId };
  }

  const { error: ledErr } = await supabase.schema(FINANCE_SCHEMA).from("ledger").insert({
    user_id: userId,
    type: "subscription_revenue",
    amount: amountUsd > 0 ? amountUsd : 0,
    currency: currency === "USD" ? "USD" : currency,
    status: "posted",
    metadata: {
      stripe_event_id: event.id,
      stripe_session_id: session.id,
      mode: session.mode || null,
      payment_status: session.payment_status || null,
      source: "stripe_checkout",
    },
  });

  if (ledErr) {
    console.warn("[stripe] ledger insert failed (profile already pro):", ledErr.message || String(ledErr));
  }

  return { ok: true, user_id: userId };
}

/**
 * Express handler — **req.body** debe ser Buffer (middleware `express.raw`).
 * @type {import('express').RequestHandler}
 */
async function handleStripeWebhook(req, res) {
  if (isFinanceMockEnabled()) {
    const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
    const mockResult = await _financeMock.handleWebhook({
      provider: "stripe",
      eventType: "checkout.session.completed",
      payload,
      client_reference_id: req?.body?.client_reference_id,
      userId: req?.body?.user_id,
    });
    return res.status(mockResult.db?.ok ? 200 : 500).json(mockResult);
  }

  const whSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!whSecret) {
    console.warn("[stripe] STRIPE_WEBHOOK_SECRET not configured");
    return res.status(503).json({ received: false, error: "webhook_secret_not_configured" });
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return res.status(400).json({ received: false, error: "missing_stripe_signature" });
  }

  const payload = req.body;
  if (!Buffer.isBuffer(payload)) {
    console.warn("[stripe] req.body is not a Buffer — is express.json() mounted before this route?");
    return res.status(400).json({
      received: false,
      error: "invalid_body_expected_raw_buffer",
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    console.warn("[stripe] STRIPE_SECRET_KEY not configured (needed for webhook SDK)");
    return res.status(503).json({ received: false, error: "stripe_secret_not_configured" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, whSecret);
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn("[stripe] constructEvent failed:", msg);
    return res.status(400).send(`Webhook signature verification failed: ${msg}`);
  }

  if (event.type !== "checkout.session.completed") {
    return res.json({ received: true, ignored: true, type: event.type });
  }

  const session = event.data.object;
  if (!session || !String(session.id || "").startsWith("cs_")) {
    return res.status(400).json({ received: false, error: "invalid_checkout_session" });
  }

  if (session.payment_status && session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return res.json({ received: true, skipped: true, reason: "payment_not_completed", payment_status: session.payment_status });
  }

  try {
    const userId = await resolveUserIdFromSession(session);
    if (!userId) {
      console.warn("[stripe] checkout.session.completed: could not resolve user (set client_reference_id to auth user uuid)");
      return res.status(200).json({
        received: true,
        warning: "user_not_resolved",
        hint: "Pass client_reference_id=<supabase_user_uuid> when creating Checkout Session",
      });
    }

    const result = await upsertProSubscription(userId, event, session);
    if (!result.ok) {
      console.error("[stripe] upsertProSubscription:", result.error);
      return res.status(500).json({ received: false, error: result.error });
    }

    console.log(`[stripe] Revenue Engine: user ${userId} → pro (event ${event.id})`);
    return res.json({ received: true, user_id: userId, tier: "pro" });
  } catch (err) {
    console.error("[stripe] handler error:", err?.message || String(err));
    return res.status(500).json({ received: false, error: err?.message || String(err) });
  }
}

/**
 * Middleware RAW exclusivo para esta ruta (encadenar antes del handler).
 */
function stripeWebhookRawBody() {
  const express = require("express");
  return express.raw({ type: "application/json" });
}

module.exports = {
  handleStripeWebhook,
  stripeWebhookRawBody,
  resolveUserIdFromSession,
  isFinanceMockEnabled,
};
