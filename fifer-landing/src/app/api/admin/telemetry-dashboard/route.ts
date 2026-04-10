import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getTelemetryDashboardPayload } from "@/lib/admin/telemetry-dashboard-data";

/**
 * JSON del Command Center — misma sesión que `/admin/*` (`fifer_auth`).
 */
export async function GET() {
  const auth = cookies().get("fifer_auth")?.value;
  if (auth !== "1") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = await getTelemetryDashboardPayload();
  return NextResponse.json(payload);
}
