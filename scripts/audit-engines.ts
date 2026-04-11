/**
 * Engine Auditor — Constitución v6.0 Cap. 5 Regla 4: auto-regeneración de _blueprints/
 * por motor bajo src/engines/. No modifica código .ts/.js de motores existentes.
 * Ordenanza §8: asegura `_xray_DATABASE.md` en motores, sub-motores y apps (dashboard).
 */
import fs from "fs";
import path from "path";
import { buildXrayDatabaseBlueprint } from "./xray-database-blueprint.js";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const ENGINES_ROOT = path.join(PROJECT_ROOT, "src", "engines");

const TRY_CATCH_RE = /\btry\b|\bcatch\b/;

const CONTRACT_TEMPLATE = `# Contrato Zod (Motor)

**Estado:** Contrato Zod pendiente de tipar.

Documentar aquí los esquemas Zod de entrada/salida, validaciones y límites del motor una vez definidos.
`;

const LOGIC_TEMPLATE = `# Lógica y dependencias

**Estado:** Lógica y dependencias del motor — pendiente de documentación detallada.

Describir flujo principal, módulos internos, imports críticos y efectos secundarios (I/O, red, persistencia).
`;

const HEALING_TEMPLATE = `# Healing & resiliencia (CRÍTICO)

## Estrategia AI Fallback Cascade

1. **Primario** (ej. Gemini)
2. **Secundario** (ej. Claude)
3. **Terciario** (ej. OpenAI)

**Rompecircuitos interno:** Pendiente de auditoría manual.

Completar umbrales, timeouts, reintentos y señales de degradación tras revisión humana.
`;

function ensureEnginesRoot(): void {
  if (!fs.existsSync(ENGINES_ROOT)) {
    fs.mkdirSync(ENGINES_ROOT, { recursive: true });
    console.log(
      "[INFO] Carpeta src/engines/ creada. Lista para recibir Micro-Cores."
    );
  }
}

function listMotorDirs(): string[] {
  if (!fs.existsSync(ENGINES_ROOT)) return [];
  return fs
    .readdirSync(ENGINES_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

const XRAY_FILES = [
  ["_xray_CONTRACT.md", CONTRACT_TEMPLATE] as const,
  ["_xray_LOGIC.md", LOGIC_TEMPLATE] as const,
  ["_xray_HEALING.md", HEALING_TEMPLATE] as const,
] as const;

const DATABASE_BLUEPRINT = "_xray_DATABASE.md";

/**
 * Crea `_blueprints/` y/o los `_xray_*.md` faltantes (sin sobrescribir contenido existente).
 */
function healBlueprints(motorPath: string, motorLabel: string): boolean {
  const bp = path.join(motorPath, "_blueprints");
  let healed = false;
  if (!fs.existsSync(bp)) {
    fs.mkdirSync(bp, { recursive: true });
    healed = true;
  }
  for (const [fileName, tmpl] of XRAY_FILES) {
    const p = path.join(bp, fileName);
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, tmpl, "utf8");
      healed = true;
    }
  }
  const dbPath = path.join(bp, DATABASE_BLUEPRINT);
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
      dbPath,
      buildXrayDatabaseBlueprint({ kind: "engine", slug: motorLabel }),
      "utf8"
    );
    healed = true;
  }
  if (healed) {
    console.log(`[HEALED] Planos auto-generados para: ${motorLabel}`);
  }
  return healed;
}

function blueprintFilesComplete(motorPath: string): boolean {
  const bp = path.join(motorPath, "_blueprints");
  if (!fs.existsSync(bp)) return false;
  const staticOk = XRAY_FILES.every(([fileName]) =>
    fs.existsSync(path.join(bp, fileName))
  );
  return staticOk && fs.existsSync(path.join(bp, DATABASE_BLUEPRINT));
}

function resolveDashboardRoots(): string[] {
  const roots: string[] = [];
  const flat = path.join(PROJECT_ROOT, "src", "app", "(dashboard)");
  const nested = path.join(
    PROJECT_ROOT,
    "fifer-landing",
    "src",
    "app",
    "(dashboard)"
  );
  if (fs.existsSync(flat)) roots.push(flat);
  if (fs.existsSync(nested)) roots.push(nested);
  return roots;
}

function collectBlueprintDirsUnder(dashboardRoot: string): string[] {
  const out: string[] = [];
  function walk(current: string): void {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(current, e.name);
      if (e.name === "_blueprints") {
        out.push(full);
        continue;
      }
      walk(full);
    }
  }
  walk(dashboardRoot);
  return out;
}

/**
 * Apps: toda carpeta `_blueprints/` bajo `(dashboard)` debe incluir `_xray_DATABASE.md`.
 */
function healAppDatabaseBlueprints(): void {
  const roots = resolveDashboardRoots();
  const seen = new Set<string>();
  for (const root of roots) {
    for (const bpDir of collectBlueprintDirsUnder(root)) {
      const key = path.normalize(bpDir);
      if (seen.has(key)) continue;
      seen.add(key);
      const dbFile = path.join(bpDir, DATABASE_BLUEPRINT);
      if (fs.existsSync(dbFile)) continue;
      const appRoot = path.dirname(bpDir);
      const label =
        path.relative(root, appRoot).replace(/\\/g, "/") || "(dashboard)";
      fs.writeFileSync(
        dbFile,
        buildXrayDatabaseBlueprint({ kind: "app", displayName: label }),
        "utf8"
      );
      console.log(`[HEALED APP] ${DATABASE_BLUEPRINT} → ${label}`);
    }
  }
}

function rootTsFilesHaveTryCatch(motorPath: string): boolean {
  const entries = fs.readdirSync(motorPath, { withFileTypes: true });
  const tsFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".ts"))
    .map((e) => e.name);
  if (tsFiles.length === 0) return true;
  for (const name of tsFiles) {
    const content = fs.readFileSync(path.join(motorPath, name), "utf8");
    if (TRY_CATCH_RE.test(content)) return true;
  }
  return false;
}

function main(): void {
  ensureEnginesRoot();
  healAppDatabaseBlueprints();

  const motors = listMotorDirs();

  if (motors.length === 0) {
    console.log(
      "[INFO] No hay motores en src/engines/ (subcarpetas). Añade Micro-Cores cuando corresponda."
    );
    return;
  }

  for (const motorName of motors) {
    const motorPath = path.join(ENGINES_ROOT, motorName);
    healBlueprints(motorPath, motorName);

    if (!blueprintFilesComplete(motorPath)) {
      console.log(
        `[WARN] ${motorName} — planos incompletos en _blueprints/ (falta algún _xray_*.md).`
      );
    }

    if (!rootTsFilesHaveTryCatch(motorPath)) {
      console.log(
        `[WARN] ${motorName} carece de bloque try/catch global. Requiere cirugía manual.`
      );
    } else {
      console.log(`[OK] ${motorName} - Cumple protocolo v6.0.`);
    }

    const subEnginesRoot = path.join(motorPath, "sub-engines");
    if (!fs.existsSync(subEnginesRoot)) continue;

    const subDirs = fs
      .readdirSync(subEnginesRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const subName of subDirs) {
      const subPath = path.join(subEnginesRoot, subName);
      const label = `${motorName}/sub-engines/${subName}`;
      healBlueprints(subPath, label);

      if (!blueprintFilesComplete(subPath)) {
        console.log(
          `[WARN] ${label} — planos incompletos en _blueprints/ (falta algún _xray_*.md).`
        );
      }

      if (!rootTsFilesHaveTryCatch(subPath)) {
        console.log(
          `[WARN] ${label} carece de bloque try/catch en .ts raíz del sub-motor. Requiere cirugía manual.`
        );
      } else {
        console.log(`[OK] ${label} - Cumple protocolo v6.0.`);
      }
    }
  }
}

main();
