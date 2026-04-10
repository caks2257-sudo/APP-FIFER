import { NextResponse } from "next/server";
import { providerById } from "@/config/ai-toolkit";
import { resolveAnthropicKey } from "@/lib/ai-toolkit-readiness";

export const runtime = "nodejs";

const UPSTREAM = "https://api.anthropic.com/v1/messages";

/**
 * POST — proxy Anthropic Messages (editorial / código).
 * Body: contrato Anthropic (`messages`, `max_tokens`, `model` opcional).
 */
export async function POST(req: Request) {
  const key = resolveAnthropicKey();
  const meta = providerById("anthropic_editorial");
  if (!key) {
    return NextResponse.json(
      {
        error: "Anthropic no configurada",
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
    process.env.FIFER_ANTHROPIC_MODEL ||
    meta?.defaultModel ||
    "claude-sonnet-4-20250514";

  const res = await fetch(UPSTREAM, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
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
