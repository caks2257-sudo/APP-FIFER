/**
 * Phase 2 contract tests:
 * 1) Legacy FIFER (fifer-landing) endpoints — must stay behavior-stable (no accidental coupling to new API).
 * 2) Optional: new /api/v1/* routes when implemented (set API_V1_BASE + TOKEN).
 *
 * Run (Node 18+):
 *   FIFER_LANDING_URL=http://localhost:3000 node --test tests/contract/phase2_contract.test.mjs
 */

import assert from "node:assert/strict";
import test from "node:test";

const LANDING = process.env.FIFER_LANDING_URL || "http://localhost:3000";
const API_V1 = process.env.API_V1_BASE || ""; // e.g. https://api.example/api/v1
const TOKEN = process.env.FIFER_API_TEST_TOKEN || "";

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, opts);
  const text = await r.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { r, body, text };
}

async function fetchOrSkip(url, opts = {}) {
  try {
    return await fetch(url, opts);
  } catch (e) {
    if (e && (e.code === "ECONNREFUSED" || e.cause?.code === "ECONNREFUSED")) {
      return null;
    }
    throw e;
  }
}

test("legacy: GET /api/tiktok/auth without TikTok keys returns 500 and plain-text error", async () => {
  const url = `${LANDING}/api/tiktok/auth`;
  const r = await fetchOrSkip(url, { redirect: "manual" });
  if (!r) {
    test.skip(`cannot reach ${LANDING} (start fifer-landing: npm run dev)`);
    return;
  }
  // Dev without keys: 500 + "Missing TikTok client key"
  assert.ok(
    r.status === 500 || r.status === 307,
    `expected 500 (no key) or 307 (redirect when key set); got ${r.status} for ${url}`
  );
  if (r.status === 500) {
    const t = await r.text();
    assert.match(t, /Missing TikTok client key/);
  }
});

test("legacy: TikTok verification TXT returns fixed prefix", async () => {
  const path = "/tiktokILRHOJ6PtrpGd4bErLjYlXMNhrHRntEh.txt";
  const r = await fetchOrSkip(`${LANDING}${path}`);
  if (!r) {
    test.skip(`cannot reach ${LANDING}`);
    return;
  }
  assert.equal(r.status, 200);
  const t = await r.text();
  assert.ok(
    t.startsWith("tiktok-developers-site-verification="),
    `unexpected verification body: ${t.slice(0, 80)}`
  );
});

test("legacy: GET /api/tiktok/callback without code redirects to auth success with status=missing_code", async () => {
  const r = await fetchOrSkip(`${LANDING}/api/tiktok/callback`, { redirect: "manual" });
  if (!r) {
    test.skip(`cannot reach ${LANDING}`);
    return;
  }
  assert.equal(r.status, 307, "callback should redirect");
  const loc = r.headers.get("location") || "";
  assert.ok(loc.includes("status=missing_code"), `unexpected Location: ${loc}`);
});

test("new API (optional): GET /tag-center/tags returns 401 without token when API_V1_BASE set", async () => {
  if (!API_V1) {
    test.skip("API_V1_BASE not set — skipping new-route checks");
    return;
  }
  const { r, body } = await fetchJson(`${API_V1}/tag-center/tags`);
  assert.ok(
    r.status === 401 || r.status === 404 || r.status === 503,
    `expected 401/404/503 for unauthenticated or unimplemented; got ${r.status}`
  );
  if (r.status === 401 && body && typeof body === "object" && body.error) {
    assert.equal(typeof body.error.code, "string");
  }
});

test("new API (optional): estimate-credits returns envelope when TOKEN + API set", async () => {
  if (!API_V1 || !TOKEN) {
    test.skip("API_V1_BASE or FIFER_API_TEST_TOKEN not set");
    return;
  }
  const { r, body } = await fetchJson(`${API_V1}/tag-center/estimate-credits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lines: [{ engineId: "gemini_flash_text", unit: "1k_tokens", qty: 1 }],
    }),
  });
  assert.ok([200, 400, 503].includes(r.status), `unexpected ${r.status}`);
  if (r.status === 200 && body && typeof body === "object") {
    assert.ok("total" in body);
    assert.ok("breakdown" in body);
    assert.equal(body.currency, "credits");
  }
});
