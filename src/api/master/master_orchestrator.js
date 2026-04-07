const serviceNodes = require("../../config/service_nodes.json");
const { successResponse, errorResponse } = require("../../utils/response_builder");

function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function resolveNode(nodeKey) {
  return serviceNodes?.nodes?.[nodeKey] || null;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function auditCommunication(logEntry) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !apiKey) return;

  const url = `${supabaseUrl}/rest/v1/service_comm_audit`;
  const payload = {
    at: new Date().toISOString(),
    service: logEntry.service,
    operation: logEntry.operation,
    success: Boolean(logEntry.success),
    status_code: Number(logEntry.status_code || 0),
    latency_ms: Number(logEntry.latency_ms || 0),
    retries: Number(logEntry.retries || 0),
    details: logEntry.details || {},
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
        "Content-Profile": "fifer_platform",
      },
      body: JSON.stringify(payload),
    });
  } catch (_err) {
    // Audit logging is best effort and must not block the orchestration response.
  }
}

class MasterOrchestrator {
  constructor(opts = {}) {
    this.defaultTimeoutMs = Number(opts.defaultTimeoutMs || serviceNodes.defaults.timeout_ms || 3500);
    this.defaultRetries = Number(opts.defaultRetries || serviceNodes.defaults.retry_attempts || 2);
    this.internalKey = String(opts.internalKey || process.env.FIFER_INTERNAL_KEY || "").trim();
  }

  async dispatch({ node: nodeKey, operation = "proxy_default", method = "GET", body = null, query = "" }) {
    const node = resolveNode(nodeKey);
    if (!node) {
      return errorResponse(`Unknown node: ${nodeKey}`, { node: "master_orchestrator" });
    }

    if (node.enabled_env && !truthy(process.env[node.enabled_env])) {
      return errorResponse(`Node ${node.name} is disabled by ${node.enabled_env}`, {
        node: node.name,
      });
    }

    const timeoutMs = Number(node.timeout_ms || this.defaultTimeoutMs);
    const maxRetries = Number(node.retry_attempts ?? this.defaultRetries);
    const routePath = node.routes?.[operation] || node.routes?.proxy_default || "";
    const endpoint = `${node.base_url}${routePath}${query || ""}`;

    let lastError = null;
    let retriesUsed = 0;
    const startedAt = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      retriesUsed = attempt;
      try {
        const response = await fetchWithTimeout(
          endpoint,
          {
            method,
            headers: {
              "Content-Type": "application/json",
              "X-FIFER-INTERNAL-KEY": this.internalKey,
            },
            body: body == null ? undefined : JSON.stringify(body),
          },
          timeoutMs
        );

        const text = await response.text();
        let payload = null;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch (_parseErr) {
          payload = { raw: text };
        }

        const latencyMs = Date.now() - startedAt;
        await auditCommunication({
          service: node.name,
          operation,
          success: response.ok,
          status_code: response.status,
          latency_ms: latencyMs,
          retries: retriesUsed,
          details: { endpoint },
        });

        if (!response.ok && attempt < maxRetries) continue;

        if (!response.ok) {
          return errorResponse(`Node ${node.name} returned ${response.status}`, {
            node: node.name,
            retries: retriesUsed,
            latency_ms: latencyMs,
          }, payload);
        }

        return successResponse(payload, {
          node: node.name,
          retries: retriesUsed,
          latency_ms: latencyMs,
        });
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) continue;
      }
    }

    const latencyMs = Date.now() - startedAt;
    await auditCommunication({
      service: node.name,
      operation,
      success: false,
      status_code: 0,
      latency_ms: latencyMs,
      retries: retriesUsed,
      details: { endpoint, error: lastError?.message || String(lastError) },
    });

    return errorResponse(lastError || `Node ${node.name} timeout`, {
      node: node.name,
      retries: retriesUsed,
      latency_ms: latencyMs,
    });
  }
}

module.exports = {
  MasterOrchestrator,
  resolveNode,
  truthy,
};
