/**
 * Internal HTTP helpers for vascular pipelines (ISC).
 * All outbound calls include X-FIFER-INTERNAL-KEY — never expose this from the browser.
 */
const serviceNodes = require("../../../config/service_nodes.json");

function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function getNode(nodeKey) {
  return serviceNodes?.nodes?.[nodeKey] || null;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} nodeKey — e.g. 'tag-center', 'marketing'
 * @param {{ operation?: string, method?: string, body?: object|null, query?: string }} opts
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string | null }>}
 */
async function callInternalNode(nodeKey, opts = {}) {
  const { operation = "proxy_default", method = "GET", body = null, query = "" } = opts;
  const node = getNode(nodeKey);
  if (!node) {
    return { ok: false, status: 0, data: null, error: `unknown_node:${nodeKey}` };
  }

  if (node.enabled_env && !truthy(process.env[node.enabled_env])) {
    return {
      ok: false,
      status: 503,
      data: null,
      error: `node_disabled:${node.enabled_env}`,
    };
  }

  const routePath = node.routes?.[operation] || node.routes?.proxy_default || "";
  const url = `${node.base_url}${routePath}${query}`;
  const internalKey = String(process.env.FIFER_INTERNAL_KEY || "").trim();
  const timeoutMs = Number(node.timeout_ms || serviceNodes.defaults?.timeout_ms || 3500);

  if (!internalKey) {
    return { ok: false, status: 503, data: null, error: "FIFER_INTERNAL_KEY not configured" };
  }

  try {
    const res = await fetchWithTimeout(
      url,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-FIFER-INTERNAL-KEY": internalKey,
        },
        body: body == null ? undefined : JSON.stringify(body),
      },
      timeoutMs
    );

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_e) {
      data = { raw: text };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: `http_${res.status}`,
      };
    }

    return { ok: true, status: res.status, data, error: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || String(err),
    };
  }
}

async function callTagCenter(opts) {
  return callInternalNode("tag-center", opts);
}

async function callMarketing(opts) {
  return callInternalNode("marketing", opts);
}

module.exports = {
  callInternalNode,
  callTagCenter,
  callMarketing,
};
