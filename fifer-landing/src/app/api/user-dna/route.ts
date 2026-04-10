import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

function resolveUserDNAPath(): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "..", "src", "modules", "user", "_xray_USER_DNA.md"),
    path.join(cwd, "src", "modules", "user", "_xray_USER_DNA.md"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * GET — contenido de `_xray_USER_DNA.md` en el monorepo (para inyección en IA).
 */
export async function GET() {
  const resolved = resolveUserDNAPath();
  if (!resolved) {
    return new NextResponse(
      "# User DNA\n\n(Archivo `_xray_USER_DNA.md` no encontrado en `src/modules/user/`.)",
      { status: 200, headers: { "Content-Type": "text/markdown; charset=utf-8" } }
    );
  }
  const text = fs.readFileSync(resolved, "utf8");
  return new NextResponse(text, {
    status: 200,
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
