import { NextResponse } from "next/server";
import { AI_TOOLKIT_PROVIDERS } from "@/config/ai-toolkit";
import { getAiToolkitReadiness } from "@/lib/ai-toolkit-readiness";

export const runtime = "nodejs";

/**
 * GET — qué proveedores del toolkit tienen credenciales (solo booleanos / nombres de env).
 */
export async function GET() {
  const providers = getAiToolkitReadiness();
  return NextResponse.json({
    ok: true,
    year: 2026,
    catalog: AI_TOOLKIT_PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      category: p.category,
      fiferRoute: p.fiferRoute,
      envKeys: [...p.envKeys],
    })),
    providers,
  });
}
