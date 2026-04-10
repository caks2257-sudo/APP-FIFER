import { NextResponse } from "next/server";
import { providerById } from "@/config/ai-toolkit";
import { resolveOpenAiKey } from "@/lib/ai-toolkit-readiness";

export const runtime = "nodejs";

const UPSTREAM = "https://api.openai.com/v1/audio/transcriptions";

/**
 * POST — Whisper: transcribe audio (órdenes por voz en dashboard).
 * Body: multipart/form-data con `file` (audio) y opcionalmente `model`, `language`, `prompt` (contrato OpenAI).
 */
export async function POST(req: Request) {
  const key = resolveOpenAiKey();
  const meta = providerById("openai_whisper");
  if (!key) {
    return NextResponse.json(
      {
        error: "OpenAI no configurada (Whisper)",
        hint: `Define ${meta?.envKeys.join(" o ")}`,
        fiferRoute: meta?.fiferRoute,
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Se esperaba multipart/form-data" }, { status: 400 });
  }

  if (!formData.has("file")) {
    return NextResponse.json({ error: "Campo file requerido (audio)" }, { status: 400 });
  }

  if (!formData.has("model")) {
    formData.set("model", process.env.FIFER_WHISPER_MODEL || meta?.defaultModel || "whisper-1");
  }

  const res = await fetch(UPSTREAM, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
    },
    body: formData,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
