import { NextResponse } from "next/server";
import { providerById } from "@/config/ai-toolkit";
import { resolveRunwayKey } from "@/lib/ai-toolkit-readiness";

export const runtime = "nodejs";

function runwayTargetUrl(): string | null {
  const full = process.env.FIFER_RUNWAY_API_URL?.trim();
  if (full) return full.replace(/\/+$/, "");

  const base = (process.env.FIFER_RUNWAY_API_BASE_URL || "https://api.runwayml.com/v1").replace(/\/+$/, "");
  const path = (process.env.FIFER_RUNWAY_GENERATE_PATH || "/generate").trim();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * POST — proxy a Runway (Gen-3 Alpha u otro endpoint que definas por env).
 * Body: JSON tal cual exija la API Runway en tu cuenta (evoluciona con el producto).
 */
export async function POST(req: Request) {
  const key = resolveRunwayKey();
  const meta = providerById("runway_gen3");
  if (!key) {
    return NextResponse.json(
      {
        error: "Runway no configurada",
        hint: `Define ${meta?.envKeys.join(" o ")} y opcionalmente FIFER_RUNWAY_API_URL (URL completa) o FIFER_RUNWAY_API_BASE_URL + FIFER_RUNWAY_GENERATE_PATH`,
        fiferRoute: meta?.fiferRoute,
      },
      { status: 503 }
    );
  }

  const url = runwayTargetUrl();
  if (!url) {
    return NextResponse.json({ error: "No se pudo resolver URL de Runway" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  const ver = process.env.FIFER_RUNWAY_API_VERSION?.trim();
  if (ver) headers["X-Runway-Version"] = ver;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
