/**
 * v0 Pack Mirror — copia fuentes de verdad del monorepo a `v0_pack/` con nombres fijos 01–13 (v7.1) para subir a v0 sin copiar/pegar manual.
 * `10_USER_DNA.md` se genera **destilado** (esencia para diseño), no copia literal del ADN canónico.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { applyJanitorToMarkdown } from "./dna-distiller";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Raíz del monorepo (…/src/utils → sube dos niveles). */
export function getRepoRoot(): string {
  return path.resolve(__dirname, "..", "..");
}

/** Secciones del ADN que deben llegar a v0 (diseño / tono / foco; sin finanzas ni protocolo técnico). */
const V0_DNA_SECTION_RES: ReadonlyArray<RegExp> = [
  /^Resumen ejecutivo/i,
  /^Core Identity\b/i,
  /^Estética y gustos/i,
  /^Momentum\s*\(/i,
];

/**
 * Construye el markdown **destilado** para `v0_pack/10_USER_DNA.md` a partir del ADN ya pasado por el Conserje en memoria.
 */
export function distillUserDnaForV0Pack(janitorCleanedMd: string): string {
  const chunks = janitorCleanedMd.split(/^## /gm);
  const sections = chunks.slice(1).map((c) => {
    const nl = c.indexOf("\n");
    const title = nl === -1 ? c.trim() : c.slice(0, nl).trim();
    const body = nl === -1 ? "" : c.slice(nl + 1);
    return { title, body };
  });

  const kept = sections.filter((s) => V0_DNA_SECTION_RES.some((re) => re.test(s.title.trim())));
  const body = kept.map((s) => `## ${s.title}\n${s.body}`).join("\n\n");

  const header = [
    `# User DNA — destilado para v0 (v0_pack)`,
    ``,
    `> **Esencia para diseño:** Cristobal Kupfer · Arquitecto / Real Estate · FIFER · ABKupfer · Chicureo · Deep Navy + Electric Yellow. Este archivo **no** incluye la capa financiera acumulativa, protocolo Conserje ni bloques de privacidad técnica — solo señales para widgets y alertas.`,
    ``,
  ].join("\n");

  return `${header}\n${body}\n`;
}

/**
 * Lee `_xray_USER_DNA.md`, aplica reglas del Conserje en memoria y destila para v0.
 */
export function buildV0UserDnaDestilledContent(repoRoot: string): string {
  const src = path.join(repoRoot, "src", "modules", "user", "_xray_USER_DNA.md");
  const raw = fs.readFileSync(src, "utf8");
  const { text: cleaned } = applyJanitorToMarkdown(raw);
  return distillUserDnaForV0Pack(cleaned);
}

/** Número de archivos en el pack numerado (01–13, v7.1). */
export const V0_MIRROR_ENTRY_COUNT = 13;

/**
 * Los orígenes del espejo usan rutas relativas a la **raíz del repo**. Dentro de `v0_pack/` hace falta subir un nivel (`../`) para que enlaces Markdown sigan válidos al subir solo la carpeta a Drive / NotebookLM.
 */
export function applyV0PackMarkdownLinkAdjustments(md: string): string {
  let s = md;
  const collapse4 = new RegExp("\\]\\((?:\\.\\./){4}([^)]+)\\)", "g");
  const collapse3 = new RegExp("\\]\\((?:\\.\\./){3}([^)]+)\\)", "g");
  const collapse2 = new RegExp("\\]\\((?:\\.\\./){2}([^)]+)\\)", "g");
  s = s.replace(collapse4, "](../$1)");
  s = s.replace(collapse3, "](../$1)");
  s = s.replace(collapse2, "](../$1)");
  s = s.split("](./_xray_").join("](../_xray_");
  s = s.split("](./fifer-landing/").join("](../fifer-landing/");
  s = s.split("](./FIFER_").join("](../FIFER_");
  s = s.split("](./docs/").join("](../docs/");
  for (const p of ["fifer-content/", "fifer-ingestor/", "saas-fifer/", "src/"]) {
    s = s.split(`](${p}`).join(`](../${p}`);
  }
  s = s.split("](_xray_").join("](../_xray_");
  while (s.includes("](../../")) {
    s = s.split("](../../").join("](../");
  }
  return s;
}

/**
 * Orden estricto 01–13: [archivo destino en v0_pack/, ruta origen relativa a la raíz del repo]
 */
export const V0_MIRROR_ENTRIES: ReadonlyArray<readonly [string, string]> = [
  ["01_REPORT_MAESTRO.md", "FIFER_XRAY_REPORT.md"],
  ["02_MASTER_STYLE.md", "_xray_v0_MASTER.md"],
  ["03_PROTOCOL_SHELL.md", "_xray_PROTOCOL_SHELL.md"],
  ["04_INTEGRATIONS_HEALTH.md", "_xray_INTEGRATIONS.md"],
  ["05_LOCAL_FINANCE.md", "fifer-landing/src/modules/finance/_xray_v0_local.md"],
  ["06_LOCAL_CONTENT.md", "fifer-landing/src/modules/content/_xray_v0_local.md"],
  ["07_LOCAL_AFFILIATES.md", "fifer-landing/src/modules/affiliates/_xray_v0_local.md"],
  ["08_STYLEGUIDE_TOKENS.md", "docs/styleguide.md"],
  ["09_AI_PERSONA.md", "docs/ai_persona.md"],
  ["10_USER_DNA.md", "src/modules/user/_xray_USER_DNA.md"],
  ["11_INTEGRATIONS_STATUS.md", "src/modules/system/_xray_INTEGRATIONS.md"],
  ["12_AI_BENCHMARKS.md", "src/modules/ai/_xray_AI_MODELS.md"],
  ["13_FRONTEND_BLUEPRINT.md", "src/modules/system/_xray_FRONTEND_MAP.md"],
] as const;

export interface V0MirrorResult {
  ok: boolean;
  copied: string[];
  skipped: Array<{ dest: string; reason: string }>;
}

export function mirrorV0Pack(repoRoot: string = getRepoRoot()): V0MirrorResult {
  const outDir = path.join(repoRoot, "v0_pack");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const copied: string[] = [];
  const skipped: Array<{ dest: string; reason: string }> = [];

  if (V0_MIRROR_ENTRIES.length !== V0_MIRROR_ENTRY_COUNT) {
    throw new Error(
      `v0-mirror: V0_MIRROR_ENTRIES debe tener exactamente ${V0_MIRROR_ENTRY_COUNT} entradas (01–13, v7.1).`,
    );
  }

  for (const [destName, srcRel] of V0_MIRROR_ENTRIES) {
    const src = path.join(repoRoot, ...srcRel.split(/[/\\]/));
    const dest = path.join(outDir, destName);
    if (!fs.existsSync(src)) {
      skipped.push({ dest: destName, reason: `origen no encontrado: ${srcRel}` });
      continue;
    }
    if (destName === "10_USER_DNA.md") {
      try {
        const distilled = buildV0UserDnaDestilledContent(repoRoot);
        fs.writeFileSync(dest, distilled, "utf8");
      } catch (e) {
        skipped.push({
          dest: destName,
          reason: `destilado falló: ${e instanceof Error ? e.message : String(e)}`,
        });
        continue;
      }
    } else {
      const raw = fs.readFileSync(src, "utf8");
      const out = applyV0PackMarkdownLinkAdjustments(raw);
      fs.writeFileSync(dest, out, "utf8");
    }
    copied.push(destName);
  }

  return { ok: skipped.length === 0, copied, skipped };
}

export function runV0MirrorCli(): void {
  const root = getRepoRoot();
  const r = mirrorV0Pack(root);
  console.log(`[v0-sync] Raíz: ${root}`);
  for (const c of r.copied) {
    console.log(`  ✓ v0_pack/${c}`);
  }
  for (const s of r.skipped) {
    console.warn(`  ⚠ omitido ${s.dest}: ${s.reason}`);
  }
  if (!r.ok) {
    console.error("[v0-sync] Completado con advertencias (algunos orígenes faltan).");
    process.exitCode = 1;
  } else {
    console.log("[v0-sync] OK — espejo 01–13 (v7.1) actualizado en v0_pack/");
  }
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runV0MirrorCli();
}
