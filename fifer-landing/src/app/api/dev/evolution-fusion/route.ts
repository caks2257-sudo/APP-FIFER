import { NextResponse } from "next/server";

import { runEvolutionAudit } from "@/core/evolution-auditor";

export const runtime = "nodejs";

/**
 * GET — oportunidades de fusión a partir de todos los `engine_report.json` autodescubiertos.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "evolution-fusion deshabilitado en producción." }, { status: 403 });
  }
  const { discovery, opportunities, scannedAt } = await runEvolutionAudit();
  return NextResponse.json({
    ok: true,
    scannedAt,
    issues: discovery.issues,
    reports: discovery.reports,
    opportunities,
    engineCount: Object.keys(discovery.reports).length,
  });
}
