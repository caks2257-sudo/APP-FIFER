import { type NextRequest, NextResponse } from "next/server";
import { refreshEngineCatalogFromDatabase } from "@/lib/ai/engine-catalog-db";
import { getActiveEngines } from "@/lib/ai/engine-manifest";

/**
 * GET — catálogo IA efectivo. `?refresh=1` rehidrate desde Supabase + telemetría.
 */
export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  if (refresh) {
    await refreshEngineCatalogFromDatabase();
  }
  const engines = getActiveEngines();
  return NextResponse.json({
    count: engines.length,
    engines,
  });
}
