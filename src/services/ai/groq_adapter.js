const axios = require("axios");
const { decrypt } = require("../../utils/encryption.js");

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama3-70b-8192";

function readGroqConfig() {
  return {
    apiKey: String(process.env.GROQ_API_KEY || "").trim(),
    baseUrl: String(process.env.GROQ_API_BASE_URL || DEFAULT_BASE_URL).trim(),
    model: String(process.env.GROQ_TEXT_MODEL || DEFAULT_MODEL).trim(),
    timeoutMs: Number(process.env.GROQ_TIMEOUT_MS || 15000),
  };
}

function resolveApiKey(options = {}) {
  const direct = String(options.apiKey || "").trim();
  if (direct) return { ok: true, apiKey: direct, source: "direct" };
  const encrypted = String(options.encryptedApiKey || "").trim();
  if (encrypted) {
    try {
      const plain = decrypt(encrypted);
      if (!plain) {
        return { ok: false, error: "DECRYPTION_FAILED", source: "encrypted" };
      }
      return { ok: true, apiKey: plain, source: "encrypted" };
    } catch {
      return { ok: false, error: "DECRYPTION_FAILED", source: "encrypted" };
    }
  }
  const envKey = String(process.env.GROQ_API_KEY || "").trim();
  if (envKey) return { ok: true, apiKey: envKey, source: "env" };
  return { ok: false, error: "GROQ_API_KEY not configured", source: "none" };
}

/**
 * Contrato uniforme de motor IA (compatible con otros adapters):
 * {
 *   ok: boolean,
 *   status: number,
 *   data: { text, model, provider, usage, raw },
 *   error: string | null
 * }
 */
async function generateText(prompt, options = {}) {
  const cfg = readGroqConfig();
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

  const messages = Array.isArray(options.messages)
    ? options.messages
    : [
        {
          role: "user",
          content: String(prompt || "").trim(),
        },
      ];

  try {
    const res = await axios.post(
      `${cfg.baseUrl}/chat/completions`,
      {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      },
      {
        timeout: cfg.timeoutMs,
        validateStatus: () => true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keyResolved.apiKey}`,
        },
      }
    );

    const status = Number(res.status || 0);
    if (status < 200 || status >= 300) {
      return {
        ok: false,
        status,
        data: null,
        error: `groq_http_${status}`,
      };
    }

    const text = String(res.data?.choices?.[0]?.message?.content || "").trim();
    return {
      ok: true,
      status,
      data: {
        text,
        model: String(res.data?.model || model),
        provider: "groq",
        usage: res.data?.usage || null,
        raw: res.data || null,
      },
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || String(err),
    };
  }
}

async function healthCheck() {
  const probe = await generateText("ping", { max_tokens: 8, temperature: 0 });
  return {
    ok: probe.ok,
    status: probe.status,
    provider: "groq",
    model: readGroqConfig().model,
    error: probe.error,
  };
}

module.exports = {
  generateText,
  healthCheck,
  readGroqConfig,
};

