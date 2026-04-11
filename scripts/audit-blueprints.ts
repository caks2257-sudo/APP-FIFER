/**
 * Blueprint Auditor — verifica _blueprints/ e inmunidad (boxCircuitBreaker.recordFailure)
 * en apps bajo src/app/(dashboard)/.
 */
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DASHBOARD_ROOT = path.join(
  PROJECT_ROOT,
  "src",
  "app",
  "(dashboard)"
);

const BLUEPRINT_FILES = [
  "_xray_UI.md",
  "_xray_DATA.md",
  "_xray_ROUTING.md",
  "_xray_HEALING.md",
  "_xray_DATABASE.md",
] as const;

const IMMUNITY_PATTERN = /boxCircuitBreaker\.recordFailure/;

const SKIP_ROOT_TSX = new Set([
  "layout.tsx",
  "loading.tsx",
  "error.tsx",
  "template.tsx",
  "not-found.tsx",
]);

const FROM_IMPORT_RE = /from\s+["']([^"']+)["']/g;

function displayAppName(slug: string): string {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function resolveImportSpec(
  spec: string,
  appDir: string
): string | null {
  const trimmed = spec.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("@/")) {
    const rel = trimmed.slice(2);
    return path.join(PROJECT_ROOT, "src", rel);
  }

  if (trimmed.startsWith(".")) {
    return path.resolve(appDir, trimmed);
  }

  return null;
}

function resolveModuleFile(baseWithoutExt: string): string | null {
  for (const ext of [".tsx", ".ts", ".jsx", ".js"]) {
    const p = baseWithoutExt + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

function collectDirectImportsFromPage(pagePath: string, appDir: string): string[] {
  const raw = fs.readFileSync(pagePath, "utf8");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(FROM_IMPORT_RE.source, "g");
  while ((m = re.exec(raw)) !== null) {
    const spec = m[1];
    const resolvedBase = resolveImportSpec(spec, appDir);
    if (!resolvedBase) continue;
    const file = resolveModuleFile(resolvedBase);
    if (file) out.push(file);
  }
  return out;
}

function collectImmunityScanFiles(appDir: string): string[] {
  const files = new Set<string>();
  const pagePath = path.join(appDir, "page.tsx");
  if (fs.existsSync(pagePath)) {
    files.add(pagePath);
    for (const imp of collectDirectImportsFromPage(pagePath, appDir)) {
      files.add(imp);
    }
  }

  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(appDir, { withFileTypes: true });
  } catch {
    return [...files];
  }

  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith(".tsx")) continue;
    if (ent.name === "page.tsx") continue;
    if (SKIP_ROOT_TSX.has(ent.name)) continue;
    files.add(path.join(appDir, ent.name));
  }

  return [...files];
}

function fileHasImmunity(filePath: string): boolean {
  try {
    const body = fs.readFileSync(filePath, "utf8");
    return IMMUNITY_PATTERN.test(body);
  } catch {
    return false;
  }
}

type BlueprintStatus = "ok" | "missing_dir" | "missing_files";

function auditBlueprints(appDir: string): {
  status: BlueprintStatus;
  missing: string[];
} {
  const bpDir = path.join(appDir, "_blueprints");
  if (!fs.existsSync(bpDir) || !fs.statSync(bpDir).isDirectory()) {
    return { status: "missing_dir", missing: [...BLUEPRINT_FILES] };
  }
  const missing: string[] = [];
  for (const f of BLUEPRINT_FILES) {
    const p = path.join(bpDir, f);
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) missing.push(f);
  }
  if (missing.length) return { status: "missing_files", missing };
  return { status: "ok", missing: [] };
}

function main(): void {
  if (!fs.existsSync(DASHBOARD_ROOT)) {
    console.error(
      `[FATAL] No existe la ruta del dashboard: ${DASHBOARD_ROOT}`
    );
    process.exit(1);
  }

  const apps = fs
    .readdirSync(DASHBOARD_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !name.startsWith("."))
    .sort();

  if (apps.length === 0) {
    console.warn("[WARN] No hay directorios de App en (dashboard)/.");
    process.exit(0);
  }

  let exitFail = false;
  const lines: string[] = [];

  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  FIFER — Inspector de Obra (Blueprint Auditor) v1");
  console.log("═══════════════════════════════════════════════════════");
  console.log("");

  for (const app of apps) {
    const appDir = path.join(DASHBOARD_ROOT, app);
    const label = displayAppName(app);
    const issues: string[] = [];

    const bp = auditBlueprints(appDir);
    if (bp.status === "missing_dir") {
      issues.push("Falta carpeta _blueprints/");
      console.warn(`[WARN] ${label} — sin carpeta _blueprints/`);
      exitFail = true;
    } else if (bp.status === "missing_files") {
      for (const f of bp.missing) {
        const short = f.replace(/^_xray_/, "").replace(/\.md$/, "");
        issues.push(`Falta Plano ${short}`);
        console.warn(`[WARN] ${label} — falta archivo blueprint: ${f}`);
      }
      exitFail = true;
    }

    const scanFiles = collectImmunityScanFiles(appDir);
    const immune =
      scanFiles.length > 0 && scanFiles.some((f) => fileHasImmunity(f));

    if (!immune) {
      issues.push("Inmunidad no detectada (sin boxCircuitBreaker.recordFailure)");
      exitFail = true;
    }

    if (issues.length === 0) {
      lines.push(`[OK] ${label} - Inmunidad Activa - Blueprints completos`);
    } else {
      lines.push(`[FAIL] ${label} - ${issues.join("; ")}`);
    }
  }

  console.log("--- Reporte ---");
  for (const line of lines) {
    console.log(line);
  }
  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  if (exitFail) {
    console.log("Resultado: FALLÓ la auditoría (revisar [FAIL] y WARN arriba).");
    process.exit(1);
  }
  console.log("Resultado: OK — Constitución v6.0 (blueprints + inmunidad) verificada.");
  process.exit(0);
}

main();
