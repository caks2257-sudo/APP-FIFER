/**
 * Transformation Layer (Fase 3.1) — mapea payloads externos al esquema interno FIFER.
 * Extensible: añade entradas en PROVIDER_MAPPINGS sin tocar el gateway.
 */

/**
 * @typedef {object} UnifiedWebhookEvent
 * @property {string} event
 * @property {string} provider
 * @property {string} [asset_id]
 * @property {string} [status]
 * @property {Record<string, unknown>} [raw]
 */

const PROVIDER_MAPPINGS = {
  elevenlabs: mapElevenLabs,
  stripe: mapStripe,
  generic: mapGeneric,
};

/**
 * @param {string} provider
 * @param {unknown} rawData
 * @returns {UnifiedWebhookEvent}
 */
function transformPayload(provider, rawData) {
  const p = String(provider || "generic").trim().toLowerCase();
  const mapper = PROVIDER_MAPPINGS[p] || PROVIDER_MAPPINGS.generic;
  return mapper(rawData, p);
}

/**
 * ElevenLabs: clonación de voz / voces nuevas / eventos de asset.
 */
function mapElevenLabs(rawData) {
  const d = rawData && typeof rawData === "object" ? rawData : {};
  const type = String(d.type || d.event_type || d.event || "").toLowerCase();
  const voiceId =
    d.voice_id ||
    d.voice?.voice_id ||
    d.voice_id_from_discord ||
    d.data?.voice_id ||
    "";

  if (
    type.includes("clone") ||
    type.includes("voice") ||
    type.includes("finished") ||
    type.includes("completed")
  ) {
    return {
      event: "ASSET_READY",
      provider: "elevenlabs",
      asset_id: String(voiceId || d.id || "").trim() || "unknown",
      status: d.status === "failed" || d.error ? "failed" : "success",
      raw: d,
    };
  }

  if (type.includes("voice") && (d.voices || d.voice_list)) {
    return {
      event: "API_CAPABILITY_UPDATED",
      provider: "elevenlabs",
      asset_id: "",
      status: "success",
      raw: d,
    };
  }

  return {
    event: "WEBHOOK_RECEIVED",
    provider: "elevenlabs",
    asset_id: String(voiceId || "").trim(),
    status: "success",
    raw: d,
  };
}

function mapStripe(rawData) {
  const d = rawData && typeof rawData === "object" ? rawData : {};
  return {
    event: String(d.type || "stripe_event"),
    provider: "stripe",
    asset_id: String(d.id || d.data?.object?.id || "").trim(),
    status: "success",
    raw: d,
  };
}

function mapGeneric(rawData, provider) {
  const d = rawData && typeof rawData === "object" ? rawData : { value: rawData };
  return {
    event: String(d.event || d.type || "WEBHOOK_RECEIVED"),
    provider,
    asset_id: String(d.id || d.asset_id || "").trim(),
    status: String(d.status || "unknown"),
    raw: d,
  };
}

/**
 * Resuelve proveedor desde headers HTTP (firma / convenciones).
 * @param {import("http").IncomingHttpHeaders} headers
 * @param {Record<string, unknown>} [body]
 */
function resolveProviderFromHeaders(headers, body = {}) {
  const h = headers || {};
  const lower = Object.fromEntries(
    Object.entries(h).map(([k, v]) => [String(k).toLowerCase(), v])
  );

  if (lower["x-fifer-webhook-provider"]) {
    return String(lower["x-fifer-webhook-provider"]).trim().toLowerCase();
  }
  if (lower["x-elevenlabs-signature"] || lower["elevenlabs-signature"]) {
    return "elevenlabs";
  }
  if (lower["stripe-signature"]) {
    return "stripe";
  }
  if (lower["x-hub-signature-256"] || lower["x-github-event"]) {
    return "github";
  }
  if (lower["x-shopify-topic"] || lower["x-shopify-shop-domain"]) {
    return "shopify";
  }

  const b = body && typeof body === "object" ? body : {};
  if (b.provider && String(b.provider).trim()) {
    return String(b.provider).trim().toLowerCase();
  }

  return "generic";
}

module.exports = {
  transformPayload,
  resolveProviderFromHeaders,
  PROVIDER_MAPPINGS,
};
