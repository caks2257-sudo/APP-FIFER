/**
 * Maestro de reinicio: destila estado del monorepo, motores y pistas del canvas en un bloque único para Gemini.
 * Ejecutar desde `fifer-landing`: `npx tsx scripts/generateMasterPrompt.ts`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIFER_LANDING_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(FIFER_LANDING_ROOT, "..");

const require = createRequire(import.meta.url);
const { engineDispatcher } = require(path.join(REPO_ROOT, "src/engines/index.ts")) as typeof import(
  "../../src/engines/index"
);

function readIfExists(rel: string): string {
  const p = path.join(REPO_ROOT, rel);
  try {
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return `(no disponible: ${rel})`;
  }
}

function section(title: string, body: string): string {
  return [`## ${title}`, "", body, ""].join("\n");
}

function main(): void {
  const generatedAt = new Date().toISOString();
  const engineIds = engineDispatcher.listEngineIds().sort();

  const dna10 = readIfExists("v0_pack/10_USER_DNA.md");
  const protocolIndex = readIfExists("v0_pack/000_READ_FIRST_PROTOCOL_INDEX.md");
  const persona = readIfExists("v0_pack/09_AI_PERSONA.md");

  const block = [
    "# FIFER — Master Prompt de sesión (generado)",
    "",
    `> Generado: ${generatedAt}. Uso: contexto inicial para Gemini u otro modelo en sesiones nuevas.`,
    "",
    section(
      "Motores registrados (`engineDispatcher`)",
      engineIds.length ? engineIds.map((id: string) => `- \`${id}\``).join("\n") : "(ninguno)"
    ),
    section(
      "Canvas Vault (clave usada en DataCanvasBox)",
      [
        "- `canvas_key` por defecto en UI: `scraping-main`",
        "- Sincronización: API `/api/v1/canvas/state` con sesión Supabase (anon + Bearer); sin service role en cliente.",
      ].join("\n")
    ),
    section("User DNA (`v0_pack/10_USER_DNA.md`)", dna10.slice(0, 12000)),
    section("Índice de protocolo (`v0_pack/000_READ_FIRST_PROTOCOL_INDEX.md`)", protocolIndex.slice(0, 8000)),
    section("Persona IA (`v0_pack/09_AI_PERSONA.md`)", persona.slice(0, 12000)),
  ].join("\n");

  const outFile = path.join(REPO_ROOT, "v0_pack", "GENERATED_GEMINI_MASTER_PROMPT.txt");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, block, "utf8");
  console.log(`[fifer:master-prompt] wrote ${path.relative(REPO_ROOT, outFile)}`);
}

main();
