/**
 * Fifer DNA Distiller — Conserje (memoria selectiva).
 * Analiza `src/modules/user/_xray_USER_DNA.md` sin tocar datos financieros del documento ni archivos externos tipo finance-data.
 * Tras escribir una limpieza, ejecuta `v0-sync` para mantener `v0_pack/10_USER_DNA.md` alineado (§12.3 `.cursorrules`).
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DNA_JANITOR_INTERVAL = 20;

/** Máximo de focos visibles como bullets en Momentum; el resto pasa a una línea de contexto histórico. */
export const MOMENTUM_MAX_FOCI = 3;

/** Tras acumular tantas entradas en "Log de interacciones", se comprime lo antiguo. */
export const INTERACTION_LOG_MAX_ENTRIES = 20;

const STATE_FILENAME = ".dna-janitor-state.json";

/** Raíz del monorepo (…/src/utils → sube dos niveles). */
export function getRepoRoot(): string {
  return path.resolve(__dirname, "..", "..");
}

export function getUserDnaPath(repoRoot: string = getRepoRoot()): string {
  return path.join(repoRoot, "src", "modules", "user", "_xray_USER_DNA.md");
}

export function getJanitorStatePath(repoRoot: string = getRepoRoot()): string {
  return path.join(repoRoot, "src", "modules", "user", STATE_FILENAME);
}

/** Regenera `v0_pack/` (incl. `10_USER_DNA.md` destilado). No aborta el Conserje si falla. */
export function runV0PackMirrorAfterAdnClean(repoRoot: string = getRepoRoot()): void {
  try {
    execSync("npm run v0-sync", { cwd: repoRoot, stdio: "pipe", encoding: "utf8" });
    console.log("[dna-distiller] v0_pack sincronizado (01–13, incl. 10_USER_DNA.md destilado).");
  } catch (e) {
    console.warn(
      "[dna-distiller] v0-sync falló tras limpieza de ADN; ejecuta manualmente en la raíz: npm run v0-sync",
      e instanceof Error ? e.message : e
    );
  }
}

export interface JanitorApplyStats {
  changed: boolean;
  message: string;
  /** Bullets de Momentum absorbidos en Contexto histórico. */
  momentumCompressed: number;
  /** Entradas del log de interacciones absorbidas en resumen. */
  interactionLogCompressed: number;
}

function isMomentumSection(title: string): boolean {
  const t = title.trim();
  return /^Momentum\s*\(din[aá]mico\)/i.test(t);
}

function isInteractionLogSection(title: string): boolean {
  return /^Log de interacciones\b/i.test(title.trim());
}

/**
 * Financial Isolation: no mutamos la sección Financial Intelligence (precisión / histórico en el propio ADN).
 * Tampoco este módulo lee ni escribe `finance-data` u otros almacenes de números.
 */

/**
 * Si hay más de `maxFoci` bullets, los más antiguos se resumen en una sola línea `- **Contexto histórico:** …`.
 */
export function compressMomentumWithHistoricalContext(
  body: string,
  maxFoci: number = MOMENTUM_MAX_FOCI
): { text: string; compressedCount: number } {
  const rawLines = body.split(/\r?\n/);
  const lines = rawLines.filter((l) => !/^\s*[-*]\s+\*\*Contexto histórico/i.test(l));
  const bulletIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*[-*]\s+/.test(lines[i])) {
      bulletIndices.push(i);
    }
  }
  if (bulletIndices.length <= maxFoci) {
    return { text: body, compressedCount: 0 };
  }

  const drop = new Set(bulletIndices.slice(0, bulletIndices.length - maxFoci));
  const firstKept = bulletIndices[bulletIndices.length - maxFoci]!;
  const oldTexts = bulletIndices
    .slice(0, bulletIndices.length - maxFoci)
    .map((i) => lines[i].replace(/^\s*[-*]\s+/, "").trim());
  const joined = oldTexts.join(" · ");
  const summary = joined.length > 480 ? `${joined.slice(0, 480)}…` : joined;
  const histLine = `- **Contexto histórico:** ${summary}`;

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (drop.has(i)) continue;
    if (i === firstKept) {
      out.push(histLine);
    }
    out.push(lines[i]);
  }
  return { text: out.join("\n"), compressedCount: bulletIndices.length - maxFoci };
}

/**
 * Log de interacciones: si hay más de `maxEntries` bullets, resume los antiguos en una línea.
 */
export function compressInteractionLogSection(
  body: string,
  maxEntries: number = INTERACTION_LOG_MAX_ENTRIES
): { text: string; compressedCount: number } {
  return compressMomentumWithHistoricalContext(body, maxEntries);
}

export function applyJanitorToMarkdown(md: string): { text: string; stats: JanitorApplyStats } {
  const chunks = md.split(/^## /m);
  const preamble = chunks[0] ?? "";
  const sections = chunks.slice(1).map((c) => {
    const nl = c.indexOf("\n");
    const title = nl === -1 ? c.trim() : c.slice(0, nl).trim();
    const body = nl === -1 ? "" : c.slice(nl + 1);
    return { title, body };
  });

  let momentumCompressed = 0;
  let interactionLogCompressed = 0;

  let out = preamble;
  for (const { title, body } of sections) {
    let newBody = body;
    if (isMomentumSection(title)) {
      const r = compressMomentumWithHistoricalContext(body, MOMENTUM_MAX_FOCI);
      newBody = r.text;
      momentumCompressed += r.compressedCount;
    } else if (isInteractionLogSection(title)) {
      const r = compressInteractionLogSection(body, INTERACTION_LOG_MAX_ENTRIES);
      newBody = r.text;
      interactionLogCompressed += r.compressedCount;
    }
    // Financial Intelligence y resto: sin tocar (aislamiento financiero).
    out += `## ${title}\n${newBody}`;
  }

  const changed = out !== md;
  const stats: JanitorApplyStats = {
    changed,
    message: changed
      ? `Conserje: Momentum/contexto −${momentumCompressed} focos antiguos → histórico; log interacciones −${interactionLogCompressed}. Financial sin cambios.`
      : "Conserje: sin cambios necesarios.",
    momentumCompressed,
    interactionLogCompressed,
  };
  return { text: out, stats };
}

export interface JanitorRunResult extends JanitorApplyStats {
  path: string;
}

export function runJanitorOnDnaFile(repoRoot: string = getRepoRoot()): JanitorRunResult {
  const dnaPath = getUserDnaPath(repoRoot);
  if (!fs.existsSync(dnaPath)) {
    return {
      changed: false,
      message: `Archivo no encontrado: ${dnaPath}`,
      momentumCompressed: 0,
      interactionLogCompressed: 0,
      path: dnaPath,
    };
  }
  const original = fs.readFileSync(dnaPath, "utf8");
  const { text, stats } = applyJanitorToMarkdown(original);
  if (!stats.changed) {
    return { ...stats, path: dnaPath };
  }
  fs.writeFileSync(dnaPath, text, "utf8");
  runV0PackMirrorAfterAdnClean(repoRoot);
  return { ...stats, path: dnaPath };
}

export interface JanitorState {
  interactionCount: number;
  lastJanitorAt?: string;
}

export interface RecordDnaInteractionResult {
  interactionCount: number;
  janitorTriggered: boolean;
  janitor?: JanitorRunResult;
}

export function recordDnaInteraction(repoRoot: string = getRepoRoot()): RecordDnaInteractionResult {
  const statePath = getJanitorStatePath(repoRoot);
  let state: JanitorState = { interactionCount: 0 };
  if (fs.existsSync(statePath)) {
    try {
      const raw = fs.readFileSync(statePath, "utf8");
      state = { ...state, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
  }

  state.interactionCount += 1;

  let janitorTriggered = false;
  let janitor: JanitorRunResult | undefined;

  if (state.interactionCount % DNA_JANITOR_INTERVAL === 0) {
    janitorTriggered = true;
    janitor = runJanitorOnDnaFile(repoRoot);
    state.lastJanitorAt = new Date().toISOString();
  }

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");

  return {
    interactionCount: state.interactionCount,
    janitorTriggered,
    janitor,
  };
}

export function runDnaDistillerCli(): void {
  const arg = process.argv[2];
  const root = getRepoRoot();

  if (arg === "--janitor" || arg === "janitor") {
    const r = runJanitorOnDnaFile(root);
    console.log(`[dna-distiller] ${r.message}`);
    console.log(`[dna-distiller] Archivo: ${r.path}`);
    return;
  }

  if (arg === "--tick" || arg === "tick") {
    const r = recordDnaInteraction(root);
    console.log(`[dna-distiller] Interacción #${r.interactionCount}`);
    if (r.janitorTriggered && r.janitor) {
      console.log(`[dna-distiller] Conserje: ${r.janitor.message}`);
    }
    return;
  }

  console.log(`Uso: tsx src/utils/dna-distiller.ts [--janitor | --tick]`);
  console.log(`  --janitor   Ejecuta el Conserje una vez sobre _xray_USER_DNA.md`);
  console.log(`  --tick      +1 interacción y Conserje si toca (cada ${DNA_JANITOR_INTERVAL})`);
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runDnaDistillerCli();
}
