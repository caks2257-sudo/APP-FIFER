import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { BOX_CIRCUIT_FAILURE_THRESHOLD, integrationLabelForBox } from "../../../../../../src/core/CircuitBreaker";

export const runtime = "nodejs";

function monorepoRoot(): string {
  const cwd = process.cwd();
  return path.basename(cwd) === "fifer-landing" ? path.resolve(cwd, "..") : cwd;
}

/**
 * POST — anota `_xray_INTEGRATIONS.md` cuando un Box abre el rompecircuitos (solo dev).
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Solo disponible en desarrollo." }, { status: 403 });
  }
  let body: { boxId?: string };
  try {
    body = (await req.json()) as { boxId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const boxId = typeof body.boxId === "string" ? body.boxId.trim() : "";
  if (!boxId) {
    return NextResponse.json({ ok: false, error: "boxId requerido" }, { status: 400 });
  }

  const root = monorepoRoot();
  const file = path.join(root, "src", "modules", "system", "_xray_INTEGRATIONS.md");
  if (!fs.existsSync(file)) {
    return NextResponse.json({ ok: false, error: "X-Ray no encontrado" }, { status: 404 });
  }

  const stamp = new Date().toISOString();
  const line = `\n- **${stamp}** · \`${boxId}\` · Rompecircuitos (≥${BOX_CIRCUIT_FAILURE_THRESHOLD} fallos) · ${integrationLabelForBox(boxId)}`;
  try {
    fs.appendFileSync(file, line, "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, appended: true });
}
