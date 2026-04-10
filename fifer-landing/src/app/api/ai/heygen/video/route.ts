import { NextResponse } from "next/server";
import { providerById } from "@/config/ai-toolkit";
import { resolveHeyGenKey } from "@/lib/ai-toolkit-readiness";

export const runtime = "nodejs";

function heygenTargetUrl(): string {
  const full = process.env.FIFER_HEYGEN_API_URL?.trim();
  if (full) return full.replace(/\/+$/, "");
  const base = (process.env.FIFER_HEYGEN_API_BASE_URL || "https://api.heygen.com").replace(/\/+$/, "");
  const path = (process.env.FIFER_HEYGEN_VIDEO_PATH || "/v2/video/generate").trim();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * POST — Arquitecto Virtual (avatar / video explicativo).
 * Body: JSON según HeyGen (avatar_id, script, voice, etc.).
 * Auth: header `X-Api-Key` (estándar HeyGen); si tu cuenta usa Bearer, define FIFER_HEYGEN_AUTH_HEADER=bearer.
 */
export async function POST(req: Request) {
  const key = resolveHeyGenKey();
  const meta = providerById("heygen_avatar");
  if (!key) {
    return NextResponse.json(
      {
        error: "HeyGen no configurada",
        hint: `Define ${meta?.envKeys.join(" o ")}; opcional FIFER_HEYGEN_API_URL o BASE + FIFER_HEYGEN_VIDEO_PATH`,
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

  const url = heygenTargetUrl();
  const mode = (process.env.FIFER_HEYGEN_AUTH_HEADER || "x-api-key").toLowerCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (mode === "bearer") {
    headers.Authorization = `Bearer ${key}`;
  } else {
    headers["X-Api-Key"] = key;
  }

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
