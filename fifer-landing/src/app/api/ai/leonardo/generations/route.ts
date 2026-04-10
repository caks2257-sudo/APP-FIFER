import { NextResponse } from "next/server";
import { providerById } from "@/config/ai-toolkit";
import { resolveLeonardoKey } from "@/lib/ai-toolkit-readiness";

export const runtime = "nodejs";

const UPSTREAM = "https://cloud.leonardo.ai/api/rest/v1/generations";

/**
 * POST — reenvía el cuerpo a Leonardo.ai (generations).
 * Revisa la doc oficial para el schema exacto (modelId, prompt, etc.).
 */
export async function POST(req: Request) {
  const key = resolveLeonardoKey();
  const meta = providerById("leonardo_visual");
  if (!key) {
    return NextResponse.json(
      {
        error: "Leonardo.ai no configurada",
        hint: `Define ${meta?.envKeys.join(" o ")}`,
        fiferRoute: meta?.fiferRoute,
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const res = await fetch(UPSTREAM, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
