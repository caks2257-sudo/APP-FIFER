import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const V0_READY_MESSAGE =
  "📦 v0_pack v7.1 — espejo 01–13 actualizado. Listo para subir a v0.dev";

function getMonorepoRoot(): string {
  const cwd = process.cwd();
  return path.basename(cwd) === "fifer-landing" ? path.resolve(cwd, "..") : cwd;
}

function openFolderInOsFileManager(absPath: string): void {
  if (!fs.existsSync(absPath)) return;
  const platform = process.platform;
  if (platform === "win32") {
    spawn("explorer.exe", [absPath], { detached: true, stdio: "ignore" }).unref();
  } else if (platform === "darwin") {
    spawn("open", [absPath], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [absPath], { detached: true, stdio: "ignore" }).unref();
  }
}

/**
 * POST — ejecuta `npm run v0-sync` en la raíz del monorepo y abre `v0_pack` en el explorador (solo dev).
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "v0-ready deshabilitado en producción." }, { status: 403 });
  }
  const root = getMonorepoRoot();
  const v0PackPath = path.join(root, "v0_pack");
  try {
    execSync("npm run v0-sync", { cwd: root, stdio: "pipe", encoding: "utf8" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: `v0-sync falló: ${msg}` }, { status: 500 });
  }
  try {
    openFolderInOsFileManager(v0PackPath);
  } catch {
    // Explorador opcional; el cliente sigue mostrando éxito y la ruta.
  }
  return NextResponse.json({
    ok: true,
    message: V0_READY_MESSAGE,
    v0PackPath,
  });
}
