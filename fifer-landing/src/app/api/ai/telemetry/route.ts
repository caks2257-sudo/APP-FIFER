import { NextResponse } from "next/server";
import { createFiferServiceSupabase } from "@/lib/supabase-server";
import { recordAiTelemetryEvent } from "@/lib/ai/telemetry";

type Body = {
  engineId?: string;
  latencyMs?: number;
  httpStatus?: number;
  ok?: boolean;
};

/**
 * POST — registra latencia y resultado de una llamada real (proxy interno / edge).
 */
export async function POST(req: Request) {
  const token =
    process.env.FIFER_AI_TELEMETRY_SECRET ||
    process.env.FIFER_AI_SYNC_SECRET ||
    process.env.FIFER_ADMIN_SECRET;
  if (token) {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (bearer !== token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const engineId = String(body.engineId || "").trim();
  const latencyMs = Number(body.latencyMs);
  const httpStatus = Number(body.httpStatus ?? 0);
  const ok = Boolean(body.ok);

  if (!engineId || !Number.isFinite(latencyMs)) {
    return NextResponse.json({ error: "engineId y latencyMs requeridos" }, { status: 400 });
  }

  const sb = createFiferServiceSupabase();
  await recordAiTelemetryEvent(sb, { engineId, latencyMs, httpStatus, ok });
  return NextResponse.json({ ok: true });
}
