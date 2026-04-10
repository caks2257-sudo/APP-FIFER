import { NextResponse } from "next/server";
import { providerById } from "@/config/ai-toolkit";
import { resolveElevenLabsKey } from "@/lib/ai-toolkit-readiness";

export const runtime = "nodejs";

/**
 * POST — TTS voz oficial FIFER (mini-series, Live).
 * Body JSON: { "text": string, "voice_id"?: string, "model_id"?: string, "voice_settings"?: object }
 * Respuesta: audio (p. ej. audio/mpeg) tal cual ElevenLabs.
 */
export async function POST(req: Request) {
  const key = resolveElevenLabsKey();
  const meta = providerById("elevenlabs_voice");
  if (!key) {
    return NextResponse.json(
      {
        error: "ElevenLabs no configurada",
        hint: `Define ${meta?.envKeys.join(" o ")}`,
        fiferRoute: meta?.fiferRoute,
      },
      { status: 503 }
    );
  }

  let body: {
    text?: string;
    voice_id?: string;
    model_id?: string;
    voice_settings?: Record<string, unknown>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Campo text requerido" }, { status: 400 });
  }

  const voiceId =
    (typeof body.voice_id === "string" && body.voice_id.trim()) ||
    process.env.FIFER_ELEVENLABS_VOICE_ID?.trim();
  if (!voiceId) {
    return NextResponse.json(
      {
        error: "voice_id requerido",
        hint: "Envía voice_id en el body o define FIFER_ELEVENLABS_VOICE_ID",
      },
      { status: 400 }
    );
  }

  const modelId =
    (typeof body.model_id === "string" && body.model_id.trim()) ||
    process.env.FIFER_ELEVENLABS_MODEL_ID?.trim() ||
    meta?.defaultModel ||
    "eleven_multilingual_v2";

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      ...(body.voice_settings ? { voice_settings: body.voice_settings } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: "ElevenLabs upstream", status: res.status, detail: errText.slice(0, 1200) },
      { status: 502 }
    );
  }

  const buf = await res.arrayBuffer();
  const ct = res.headers.get("Content-Type") || "audio/mpeg";
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "no-store",
    },
  });
}
