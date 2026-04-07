const axios = require("axios");
const { decrypt } = require("../../utils/encryption.js");

const DEFAULT_BASE_URL = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

function readElevenLabsConfig() {
  return {
    apiKey: String(process.env.ELEVENLABS_API_KEY || "").trim(),
    baseUrl: String(process.env.ELEVENLABS_API_BASE_URL || DEFAULT_BASE_URL).trim(),
    timeoutMs: Number(process.env.ELEVENLABS_TIMEOUT_MS || 20000),
    model: String(process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2").trim(),
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

  const envKey = String(process.env.ELEVENLABS_API_KEY || "").trim();
  if (envKey) return { ok: true, apiKey: envKey, source: "env" };
  return { ok: false, error: "ELEVENLABS_API_KEY not configured", source: "none" };
}

async function generateSpeech(text, voiceId = DEFAULT_VOICE_ID, options = {}) {
  const cfg = readElevenLabsConfig();
  const keyResolved = resolveApiKey(options);
  if (!keyResolved.ok) {
    return {
      ok: false,
      status: keyResolved.error === "DECRYPTION_FAILED" ? 400 : 503,
      data: null,
      error: keyResolved.error,
    };
  }

  const cleanText = String(text || "").trim();
  if (!cleanText) {
    return { ok: false, status: 400, data: null, error: "missing_text" };
  }

  const chosenVoiceId = String(voiceId || DEFAULT_VOICE_ID).trim();
  try {
    const res = await axios.post(
      `${cfg.baseUrl}/text-to-speech/${encodeURIComponent(chosenVoiceId)}`,
      {
        text: cleanText,
        model_id: String(options.model || cfg.model).trim(),
      },
      {
        timeout: cfg.timeoutMs,
        responseType: "arraybuffer",
        validateStatus: () => true,
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": keyResolved.apiKey,
          Accept: "audio/mpeg",
        },
      }
    );

    if (res.status < 200 || res.status >= 300) {
      return {
        ok: false,
        status: Number(res.status || 0),
        data: null,
        error: `elevenlabs_http_${res.status}`,
      };
    }

    return {
      ok: true,
      status: Number(res.status || 200),
      data: {
        audioBuffer: Buffer.from(res.data),
        mimeType: "audio/mpeg",
        provider: "elevenlabs",
        voice_id: chosenVoiceId,
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

module.exports = {
  generateSpeech,
  readElevenLabsConfig,
};
