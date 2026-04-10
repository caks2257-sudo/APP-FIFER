import { NextResponse } from "next/server";
import { discoverUserEngineReports } from "@/core/user-engine-discovery";

export const runtime = "nodejs";

/**
 * GET — resultado del escaneo de `engine_report.json` (solo desarrollo).
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "user-engine-discovery deshabilitado en producción." }, { status: 403 });
  }
  const result = await discoverUserEngineReports();
  return NextResponse.json({ ok: true, ...result });
}
