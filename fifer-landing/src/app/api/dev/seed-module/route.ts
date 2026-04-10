import { NextResponse } from "next/server";

import { createModule } from "@/utils/scaffolder";

export const runtime = "nodejs";

/**
 * POST { "name": "mi-modulo" } — ejecuta Module Seed Worker (solo desarrollo).
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "seed-module deshabilitado en producción." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }
  const name = typeof body === "object" && body !== null && "name" in body ? String((body as { name: unknown }).name) : "";
  const r = createModule(name);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    message: `Módulo "${r.moduleName}" creado en ${r.modulePath}. Revisa modules/index.ts y FIFER_XRAY_REPORT.md.`,
    moduleName: r.moduleName,
    modulePath: r.modulePath,
  });
}
