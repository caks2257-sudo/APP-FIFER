import { NextResponse } from "next/server";
import { providerById } from "@/config/ai-toolkit";
import { resolveOpenAiKey } from "@/lib/ai-toolkit-readiness";

export const runtime = "nodejs";

const UPSTREAM = "https://api.openai.com/v1/images/generations";

/**
 * POST — DALL·E 3 (texto preciso en imagen). Misma clave que chat.
 */
export async function POST(req: Request) {
  const key = resolveOpenAiKey();
  const meta = providerById("openai_dalle");
  if (!key) {
    return NextResponse.json(
      {
        error: "OpenAI no configurada (DALL·E)",
        hint: `Define ${meta?.envKeys.join(" o ")}`,
        fiferRoute: meta?.fiferRoute,
      },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const model =
    (typeof body.model === "string" && body.model) ||
    process.env.FIFER_OPENAI_IMAGE_MODEL ||
    meta?.defaultModel ||
    "dall-e-3";

  const res = await fetch(UPSTREAM, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, model }),
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
