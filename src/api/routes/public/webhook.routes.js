/**
 * Universal Webhook Gateway (Fase 3.1 — Metadata-Driven)
 * POST /universal — detecta proveedor por headers y normaliza con schema_mapper.
 */
const path = require("path");
const express = require("express");
const { successResponse, errorResponse } = require(path.join(
  __dirname,
  "../../../utils/response_builder.js"
));
const {
  transformPayload,
  resolveProviderFromHeaders,
} = require(path.join(__dirname, "../../../utils/schema_mapper.js"));

const BUS = "[FIFER_EVENT_BUS]";

function logEventBus(kind, payload) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    kind,
    ...payload,
  });
  console.log(`${BUS} ${line}`);
}

function shouldEmitCapabilityUpdate(unified) {
  if (!unified || typeof unified !== "object") return false;
  if (unified.event === "API_CAPABILITY_UPDATED") return true;
  const raw = unified.raw && typeof unified.raw === "object" ? unified.raw : {};
  if (Array.isArray(raw.voices) && raw.voices.length > 0) return true;
  if (raw.voice_list || raw.available_voices) return true;
  const ev = String(unified.event || "").toLowerCase();
  if (ev.includes("voice") && (ev.includes("add") || ev.includes("new") || ev.includes("list"))) {
    return true;
  }
  return false;
}

/**
 * @param {import("express").Router} router
 */
function attachPublicWebhookRoutes(router) {
  const jsonParser = express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  });

  router.post("/universal", jsonParser, async (req, res) => {
    const started = Date.now();
    try {
      const provider = resolveProviderFromHeaders(req.headers, req.body);
      const unified = transformPayload(provider, req.body);

      logEventBus("WEBHOOK_INGEST", {
        provider,
        unified_event: unified.event,
        path: "webhooks/universal",
      });

      if (shouldEmitCapabilityUpdate(unified)) {
        logEventBus("API_CAPABILITY_UPDATED", {
          provider: unified.provider,
          detail: "Nueva capacidad o catálogo de voces detectado",
          unified,
        });
      } else if (
        unified.provider === "elevenlabs" &&
        unified.event === "ASSET_READY" &&
        unified.status === "success"
      ) {
        logEventBus("API_CAPABILITY_UPDATED", {
          provider: "elevenlabs",
          detail: "Asset de voz listo (clonación o síntesis)",
          voice_id: unified.asset_id,
        });
      }

      return res.status(200).json(
        successResponse(
          {
            provider,
            unified,
            received_headers_sample: {
              "x-elevenlabs-signature": Boolean(
                req.headers["x-elevenlabs-signature"] || req.headers["elevenlabs-signature"]
              ),
              "stripe-signature": Boolean(req.headers["stripe-signature"]),
            },
          },
          {
            node: "universal_webhook_gateway",
            latency_ms: Date.now() - started,
          }
        )
      );
    } catch (err) {
      return res.status(500).json(
        errorResponse(err?.message || String(err), {
          node: "universal_webhook_gateway",
          latency_ms: Date.now() - started,
          code: "WEBHOOK_UNIVERSAL_ERROR",
        })
      );
    }
  });
}

module.exports = {
  attachPublicWebhookRoutes,
};
