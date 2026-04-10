import type { IAiProvider } from "./IAiProvider";
import { adaptAiProviderError, adaptAiProviderResponse, type UniversalAiEnvelope } from "./universal-adapter";

/**
 * Provider ElevenLabs (audio TTS). Skeleton listo para SDK oficial o fetch.
 */
export class ElevenLabsProvider implements IAiProvider {
  async generateAudio(
    body: Record<string, unknown>,
    apiKey: string
  ): Promise<UniversalAiEnvelope<Record<string, unknown>>> {
    try {
      const text = String(body.text ?? "").trim();
      if (!text) throw new Error("payload.text_required");
      const voiceId =
        (typeof body.voice_id === "string" && body.voice_id.trim()) ||
        process.env.FIFER_ADMIN_ELEVENLABS_VOICE_ID ||
        "";
      if (!voiceId) throw new Error("voice_id_required");

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
          model_id: body.model_id ?? process.env.FIFER_ADMIN_ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
          ...(body.voice_settings && typeof body.voice_settings === "object"
            ? { voice_settings: body.voice_settings }
            : {}),
        }),
      });

      if (!res.ok) throw new Error(`elevenlabs_upstream_error:${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return adaptAiProviderResponse("elevenlabs", "audio", {
        format: res.headers.get("content-type") || "audio/mpeg",
        audioBase64: buf.toString("base64"),
      });
    } catch (err) {
      return adaptAiProviderError("elevenlabs", "audio", err);
    }
  }

  async execute(payload: any, apiKey: string): Promise<unknown> {
    const action = String(payload?.action || "text-to-speech");
    const body = payload?.payload ?? {};
    if (action !== "text-to-speech") {
      throw new Error(`unsupported_elevenlabs_action:${action}`);
    }
    return this.generateAudio(body, apiKey);
  }
}
