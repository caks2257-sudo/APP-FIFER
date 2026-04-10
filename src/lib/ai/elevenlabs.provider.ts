export type ElevenLabsProviderResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

/**
 * ElevenLabs TTS. `payload`: { text, voice_id?, model_id?, voice_settings? }
 */
export async function runElevenlabsProvider(
  action: string,
  payload: Record<string, unknown>,
  apiKey: string
): Promise<ElevenLabsProviderResult> {
  if (!apiKey) {
    return { ok: false, status: 503, error: "missing_elevenlabs_key" };
  }

  if (action !== "text-to-speech") {
    return { ok: false, status: 400, error: `unknown_elevenlabs_action:${action}` };
  }

  const text = String(payload.text ?? "").trim();
  if (!text) {
    return { ok: false, status: 400, error: "payload.text_required" };
  }

  const voiceId =
    (typeof payload.voice_id === "string" && payload.voice_id.trim()) ||
    process.env.FIFER_ADMIN_ELEVENLABS_VOICE_ID?.trim();
  if (!voiceId) {
    return { ok: false, status: 400, error: "voice_id_or_FIFER_ADMIN_ELEVENLABS_VOICE_ID_required" };
  }

  const modelId =
    (typeof payload.model_id === "string" && payload.model_id.trim()) ||
    process.env.FIFER_ADMIN_ELEVENLABS_MODEL_ID ||
    "eleven_multilingual_v2";

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      ...(payload.voice_settings && typeof payload.voice_settings === "object"
        ? { voice_settings: payload.voice_settings }
        : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      ok: false,
      status: res.status,
      error: "elevenlabs_upstream_error",
      data: { detail: errText.slice(0, 1500) },
    };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const b64 = buf.toString("base64");
  return {
    ok: true,
    status: 200,
    data: {
      format: res.headers.get("Content-Type") || "audio/mpeg",
      audioBase64: b64,
    },
  };
}
