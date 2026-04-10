/**
 * X-Ray Validator — lee `FIFER_XRAY_REPORT.md` y valida carpetas en disco.
 * Solo importar desde Server Components, rutas API o CLI (usa `fs`).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import type { XRayModuleIssue, XRayValidatorResult } from "@/types/xray-health";

export type { XRayModuleIssue, XRayValidatorResult } from "@/types/xray-health";

export function getMonorepoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "..");
}

/**
 * Extrae nombres de carpetas de primer nivel del bloque ```text del índice (árbol APP FIFER/).
 */
export function extractDeclaredModulesFromReport(reportBody: string): string[] {
  const start = reportBody.indexOf("```text");
  if (start === -1) return [];
  const after = reportBody.indexOf("\n", start) + 1;
  const end = reportBody.indexOf("```", after);
  if (end === -1) return [];
  const block = reportBody.slice(after, end);
  const names = new Set<string>();
  for (const line of block.split("\n")) {
    const m = line.match(/([a-zA-Z0-9][a-zA-Z0-9._-]*)\/\s/);
    if (!m?.[1]) continue;
    const seg = m[1];
    if (seg === "APP" || seg === "FIFER") continue;
    names.add(seg);
  }
  return Array.from(names).sort();
}

export function runXRayValidatorSync(repoRoot: string = getMonorepoRoot()): XRayValidatorResult {
  const reportPath = path.join(repoRoot, "FIFER_XRAY_REPORT.md");
  if (!fs.existsSync(reportPath)) {
    return {
      ok: false,
      repoRoot,
      reportPath,
      declared: [],
      issues: [
        {
          module: "(índice)",
          relativePath: "FIFER_XRAY_REPORT.md",
          reason: "missing_on_disk",
        },
      ],
    };
  }

  const reportBody = fs.readFileSync(reportPath, "utf8");
  const declared = extractDeclaredModulesFromReport(reportBody);
  const issues: XRayModuleIssue[] = [];

  for (const name of declared) {
    const rel = path.join(repoRoot, name);
    const exists = fs.existsSync(rel);
    const isDir = exists && fs.statSync(rel).isDirectory();
    if (!exists || !isDir) {
      issues.push({
        module: name,
        relativePath: name,
        reason: "missing_on_disk",
      });
    }
  }

  return {
    ok: issues.length === 0,
    repoRoot,
    reportPath,
    declared,
    issues,
  };
}

export function runXRayValidatorCli(): void {
  const r = runXRayValidatorSync();
  if (r.ok) {
    console.log(`[xray:validate] OK — ${r.declared.length} módulos en índice presentes en disco.`);
    console.log(`  Raíz: ${r.repoRoot}`);
    process.exit(0);
  }
  console.error("[xray:validate] Desincronización índice ↔ disco:");
  for (const i of r.issues) {
    console.error(`  - ${i.module} → esperado: ${path.join(r.repoRoot, i.relativePath)}`);
  }
  process.exit(1);
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runXRayValidatorCli();
}
