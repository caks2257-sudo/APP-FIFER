/**
 * Module Seed Worker — genera la “célula” del dashboard: carpetas, X-Ray desde plantilla, registro en índice y reporte maestro.
 *
 * **Ruta física en el monorepo:** `fifer-landing/src/modules/<name>/` (equivale a `src/modules/[name]` dentro de la app Next).
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

import { getMonorepoRoot } from "@/utils/xray-validator";

const MODULE_NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const DASHBOARD_MODULES_SECTION = "## Módulos dashboard (scaffolding)";

export function sanitizeModuleName(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
}

export function kebabToPascal(kebab: string): string {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((s) => s[0]!.toUpperCase() + s.slice(1))
    .join("");
}

export function kebabToTitle(kebab: string): string {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((s) => s[0]!.toUpperCase() + s.slice(1))
    .join(" ");
}

function personalizeTemplate(template: string, moduleName: string): string {
  const pascal = kebabToPascal(moduleName);
  const title = kebabToTitle(moduleName);
  const today = new Date().toISOString().slice(0, 10);
  let body = template;
  body = body.replace(/«NombreModulo»/g, pascal);
  body = body.replace(/«nombre»/gi, moduleName);
  body = body.replace(/«YYYY-MM-DD»/g, today);
  body = body.replace(
    /\[`_xray_v0_MASTER\.md`\]\([^)]+\)/,
    "[`_xray_v0_MASTER.md`](../../../../_xray_v0_MASTER.md)"
  );
  body = body.replace(
    /\[`_xray_PROTOCOL_SHELL\.md`\]\([^)]+\)/,
    "[`_xray_PROTOCOL_SHELL.md`](../../../../_xray_PROTOCOL_SHELL.md)"
  );
  body = body.replace(
    /\| \*\*Estado\*\* \| ⚪ Nuevo \/ En construcción \|/,
    "| **Estado** | 🟡 En Desarrollo |"
  );
  body = body.replace(
    /^#\s+FIFER — X-Ray local \(plantilla maestra(?:\s*\/\s*molde genético)?\)/m,
    `# FIFER — X-Ray local · ${title}`
  );
  body = body.replace(/«fifer-ejemplo-box»/g, `fifer-${moduleName}-placeholder`);
  body = body.replace(/\*Auditoría X-Ray · Última sincronización: YYYY-MM-DD\*/g, `*Auditoría X-Ray · Última sincronización: ${today}*`);
  return body;
}

function upsertDashboardModuleRow(report: string, moduleName: string): string {
  const row = `| **${moduleName}** | 🟡 En Desarrollo | [\`fifer-landing/src/modules/${moduleName}/_xray_v0_local.md\`](fifer-landing/src/modules/${moduleName}/_xray_v0_local.md) |`;
  if (report.includes(`| **${moduleName}** |`)) {
    return report;
  }
  if (!report.includes(DASHBOARD_MODULES_SECTION)) {
    const anchor = "Marcar **🔴** si el X-Ray local documenta fallo o bloqueo activo.";
    const block = [
      "",
      DASHBOARD_MODULES_SECTION,
      "",
      "| Módulo | Estado | X-Ray local |",
      "|--------|--------|-------------|",
      row,
      "",
    ].join("\n");
    const idx = report.indexOf(anchor);
    if (idx === -1) {
      return `${report.trimEnd()}\n${block}`;
    }
    const afterAnchor = report.indexOf("\n", idx + anchor.length);
    const insertAt = afterAnchor === -1 ? report.length : afterAnchor + 1;
    return report.slice(0, insertAt) + block + report.slice(insertAt);
  }
  const lines = report.split("\n");
  const headerIdx = lines.findIndex((l) => l === DASHBOARD_MODULES_SECTION);
  if (headerIdx === -1) return report;
  let tableEnd = headerIdx + 1;
  while (tableEnd < lines.length && lines[tableEnd]!.startsWith("|")) {
    tableEnd += 1;
  }
  const insertAt = tableEnd;
  const next = [...lines.slice(0, insertAt), row, ...lines.slice(insertAt)];
  return next.join("\n");
}

function bumpIndexSyncDate(report: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return report.replace(
    /\*\*Última sincronización índice:\*\* \*\*\d{4}-\d{2}-\d{2}\*\*/,
    `**Última sincronización índice:** **${today}**`
  );
}

function patchModulesIndex(repoRoot: string, moduleName: string, pascal: string): void {
  const indexPath = path.join(repoRoot, "fifer-landing", "src", "modules", "index.ts");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`No se encontró modules/index.ts en ${indexPath}`);
  }
  const lines = fs.readFileSync(indexPath, "utf8").split("\n");
  const importLine = `import { ${pascal}ModuleConfig } from "./${moduleName}/module.config";`;
  if (lines.some((l) => l.includes(`"./${moduleName}/module.config"`))) {
    return;
  }
  let lastImportLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.startsWith("import ")) lastImportLine = i;
  }
  if (lastImportLine >= 0) {
    lines.splice(lastImportLine + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }
  const cfgStart = lines.findIndex((l) => l.includes("export const moduleConfigs"));
  if (cfgStart === -1) {
    throw new Error("modules/index.ts: export const moduleConfigs no encontrado");
  }
  let cfgEnd = cfgStart;
  while (cfgEnd < lines.length && lines[cfgEnd]!.trim() !== "];") {
    cfgEnd += 1;
  }
  if (cfgEnd >= lines.length) {
    throw new Error("modules/index.ts: cierre de moduleConfigs no encontrado");
  }
  lines.splice(cfgEnd, 0, `  ${pascal}ModuleConfig,`);
  fs.writeFileSync(indexPath, lines.join("\n"), "utf8");
}

export interface CreateModuleResult {
  ok: true;
  modulePath: string;
  moduleName: string;
}

export interface CreateModuleError {
  ok: false;
  error: string;
}

export interface CreateModuleOptions {
  /** Raíz del monorepo (por defecto `getMonorepoRoot()` desde este archivo). */
  repoRoot?: string;
}

/**
 * Crea `fifer-landing/src/modules/<name>/` con `module.config.ts`, `_xray_v0_local.md`, `index.ts`, `services/.gitkeep`,
 * registra el módulo en `modules/index.ts` y actualiza `FIFER_XRAY_REPORT.md`.
 */
export function createModule(name: string, options: CreateModuleOptions = {}): CreateModuleResult | CreateModuleError {
  const moduleName = sanitizeModuleName(name);
  if (!moduleName || !MODULE_NAME_RE.test(moduleName)) {
    return { ok: false, error: "Nombre inválido: usa kebab-case (ej. mi-modulo, campanas)." };
  }

  const repoRoot = options.repoRoot ?? getMonorepoRoot();
  const landingRoot = path.join(repoRoot, "fifer-landing");
  const moduleDir = path.join(landingRoot, "src", "modules", moduleName);
  if (fs.existsSync(moduleDir)) {
    return { ok: false, error: `Ya existe carpeta: fifer-landing/src/modules/${moduleName}/` };
  }

  const templatePath = path.join(repoRoot, "src", "templates", "xray-module-template.md");
  if (!fs.existsSync(templatePath)) {
    return { ok: false, error: `Plantilla no encontrada: ${templatePath}` };
  }

  const template = fs.readFileSync(templatePath, "utf8");
  const pascal = kebabToPascal(moduleName);
  const title = kebabToTitle(moduleName);

  fs.mkdirSync(path.join(moduleDir, "services"), { recursive: true });
  fs.writeFileSync(path.join(moduleDir, "services", ".gitkeep"), "", "utf8");

  const xrayBody = personalizeTemplate(template, moduleName);
  fs.writeFileSync(path.join(moduleDir, "_xray_v0_local.md"), xrayBody, "utf8");

  const moduleConfig = `import type { ModuleConfig } from "@/types/architecture";

export const ${pascal}ModuleConfig: ModuleConfig = {
  id: "${moduleName}",
  nombre: "${title}",
  icono: "layout-grid",
  routes: [
    {
      path: "/",
      slots: {
        "slot-main": [],
      },
    },
  ],
};
`;
  fs.writeFileSync(path.join(moduleDir, "module.config.ts"), moduleConfig, "utf8");

  const moduleIndex = `export { ${pascal}ModuleConfig } from "./module.config";
`;
  fs.writeFileSync(path.join(moduleDir, "index.ts"), moduleIndex, "utf8");

  const reportPath = path.join(repoRoot, "FIFER_XRAY_REPORT.md");
  if (!fs.existsSync(reportPath)) {
    return { ok: false, error: `No se encontró ${reportPath}` };
  }

  patchModulesIndex(repoRoot, moduleName, pascal);

  let report = fs.readFileSync(reportPath, "utf8");
  report = upsertDashboardModuleRow(report, moduleName);
  report = bumpIndexSyncDate(report);
  fs.writeFileSync(reportPath, report, "utf8");

  return {
    ok: true,
    modulePath: path.relative(repoRoot, moduleDir).replace(/\\/g, "/"),
    moduleName,
  };
}

export function createModuleCli(argv: string[]): void {
  const candidates = argv.slice(2).filter(Boolean);
  const name =
    candidates.filter((a) => !a.endsWith(".ts") && !a.endsWith(".tsx") && !a.includes("node_modules")).pop()?.trim() ??
    "";
  if (!name) {
    console.error("Uso: npx tsx src/utils/scaffolder.ts <nombre-kebab>");
    process.exit(1);
  }
  const r = createModule(name);
  if (!r.ok) {
    console.error(`[module:seed] Error: ${r.error}`);
    process.exit(1);
  }
  console.log(`[module:seed] OK — módulo "${r.moduleName}" en ${r.modulePath}`);
  process.exit(0);
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  createModuleCli(process.argv);
}
