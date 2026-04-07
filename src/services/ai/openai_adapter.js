const OpenAI = require("openai");
const { decrypt } = require("../../utils/encryption.js");

const DEFAULT_MODEL = "gpt-4o-mini";

function readOpenAiConfig() {
  return {
    apiKey: String(process.env.OPENAI_API_KEY || "").trim(),
    model: String(process.env.OPENAI_TEXT_MODEL || DEFAULT_MODEL).trim(),
    timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 15000),
  };
}

function resolveApiKey(options = {}) {
  const direct = String(options.apiKey || "").trim();
  if (direct) return { ok: true, apiKey: direct, source: "direct" };

  const encrypted = String(options.encryptedApiKey || "").trim();
  if (encrypted) {
    try {
      const plain = decrypt(encrypted);
      if (!plain) return { ok: false, error: "DECRYPTION_FAILED", source: "encrypted" };
      return { ok: true, apiKey: plain, source: "encrypted" };
    } catch {
      return { ok: false, error: "DECRYPTION_FAILED", source: "encrypted" };
    }
  }

  const envKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (envKey) return { ok: true, apiKey: envKey, source: "env" };
  return { ok: false, error: "OPENAI_API_KEY not configured", source: "none" };
}

async function generateText(prompt, options = {}) {
  const cfg = readOpenAiConfig();
  const keyResolved = resolveApiKey(options);
  if (!keyResolved.ok) {
    return {
      ok: false,
      status: keyResolved.error === "DECRYPTION_FAILED" ? 400 : 503,
      data: null,
      error: keyResolved.error,
    };
  }

  const model = String(options.model || cfg.model || DEFAULT_MODEL).trim();
  const temperature =
    Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.3;
  const maxTokens =
    Number.isFinite(Number(options.max_tokens)) ? Number(options.max_tokens) : 1024;

  const client = new OpenAI({
    apiKey: keyResolved.apiKey,
    timeout: cfg.timeoutMs,
  });

  try {
    const messages = Array.isArray(options.messages)
      ? options.messages
      : [{ role: "user", content: String(prompt || "").trim() }];

    const res = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const text = String(res?.choices?.[0]?.message?.content || "").trim();
    return {
      ok: true,
      status: 200,
      data: {
        text,
        model: String(res?.model || model),
        provider: "openai",
        usage: res?.usage || null,
        raw: res || null,
      },
      error: null,
    };
  } catch (err) {
    const status = Number(err?.status || err?.code || 0) || 0;
    return {
      ok: false,
      status,
      data: null,
      error: err?.message || String(err),
    };
  }
}

async function healthCheck(options = {}) {
  const probe = await generateText("ping", {
    ...options,
    max_tokens: 8,
    temperature: 0,
  });
  return {
    ok: probe.ok,
    status: probe.status,
    provider: "openai",
    model: readOpenAiConfig().model,
    error: probe.error,
  };
}

module.exports = {
  generateText,
  healthCheck,
  readOpenAiConfig,
};
