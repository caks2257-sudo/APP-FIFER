import { NextResponse } from "next/server";
import { providerById } from "@/config/ai-toolkit";
import { resolveGeminiKey } from "@/lib/ai-toolkit-readiness";

export const runtime = "nodejs";

/**
 * POST — Etapa isRefining: acorta / clarifica prompt de usuario (texto solo).
 * Body: { "prompt": string, "system"?: string }
 */
export async function POST(req: Request) {
  const key = resolveGeminiKey();
  const meta = providerById("gemini_refine");
  if (!key) {
    return NextResponse.json(
      {
        error: "Gemini no configurada",
        hint: `Define ${meta?.envKeys.join(" o ")}`,
        fiferRoute: meta?.fiferRoute,
      },
      { status: 503 }
    );
  }

  let body: { prompt?: string; system?: string };
  try {
    body = (await req.json()) as { prompt?: string; system?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Campo prompt requerido" }, { status: 400 });
  }

  const model =
    process.env.FIFER_GEMINI_REFINE_MODEL ||
    process.env.FIFER_GEMINI_MODEL ||
    meta?.defaultModel ||
    "gemini-2.0-flash";

  const system =
    body.system ||
    "Eres el refinador de instrucciones de FIFER (Chicureo + ABKupfer). Devuelve SOLO el prompt mejorado, conciso y accionable, sin preámbulos.";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${system}\n\nInstrucción original:\n${prompt}` }],
        },
      ],
      generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return NextResponse.json(
      { error: "Gemini upstream", status: res.status, detail: t.slice(0, 800) },
      { status: 502 }
    );
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const refined = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  return NextResponse.json({
    ok: true,
    provider: "gemini_refine",
    model,
    refined: refined || prompt,
  });
}
