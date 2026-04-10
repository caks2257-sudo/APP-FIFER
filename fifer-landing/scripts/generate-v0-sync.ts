/* eslint-disable @typescript-eslint/no-var-requires */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");
const { FIFER_BLUEPRINT } = require("../src/registry/master-blueprint") as typeof import("../src/registry/master-blueprint");

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = path.join(CURRENT_DIR, "../src/components/v0-ingestion/boxes");
const OUT_FILE = path.resolve(CURRENT_DIR, "../../_V0_AUTO_REPAIR_PROMPT.md");

type MissingItem = {
  boxId: string;
  sourceModule: string;
  targetSlot: string;
  capabilities: { isRefining: boolean; requiresPro: boolean; hasAIChat: boolean };
};

type RepairItem = {
  boxId: string;
  reason: string;
};

function moduleDisplayName(moduleId: string): string {
  const m = FIFER_BLUEPRINT.modules.find((x) => x.id === moduleId);
  return m?.name ?? moduleId;
}

function capabilityMap() {
  const m = new Map<string, { isRefining: boolean; requiresPro: boolean; hasAIChat: boolean }>();
  for (const box of FIFER_BLUEPRINT.boxCatalog) {
    m.set(box.boxId, box.capabilities);
  }
  return m;
}

function renderMarkdown(missing: MissingItem[], repairs: RepairItem[]): string {
  const header = [
    "## [BLOQUE DE CONTEXTO PARA v0]",
    'Actúa como UI Architect de FIFER. Lee el archivo "@00_FIFER_MASTER_BLUEPRINT.md" para entender el ADN visual (Deep Navy, Electric Yellow, Grid 12). Necesito que generes/repares los siguientes componentes estrictamente como "Dumb Components" en Tailwind puro:',
    "",
  ].join("\n");

  const missingBlock = [
    "## [LISTA DE CAJAS FALTANTES]",
    missing.length
      ? missing
          .map((m) => {
            const req: string[] = [];
            if (m.capabilities.isRefining) req.push("Asegúrate de incluir UI para isRefining.");
            if (m.capabilities.requiresPro) req.push("Incluir placeholder de JITUpsellBanner para capa PRO.");
            if (m.capabilities.hasAIChat) req.push("Mantener superficie compatible con AI chat.");
            return `- \`${m.boxId}\` | módulo: \`${m.sourceModule}\` (${moduleDisplayName(
              m.sourceModule
            )}) | slot: \`${m.targetSlot}\` | capacidades: isRefining=${m.capabilities.isRefining}, requiresPro=${
              m.capabilities.requiresPro
            }, hasAIChat=${m.capabilities.hasAIChat}. ${req.join(" ")}`.trim();
          })
          .join("\n")
      : "- Sin cajas faltantes detectadas.",
    "",
  ].join("\n");

  const repairBlock = [
    "## [LISTA DE REPARACIONES]",
    repairs.length
      ? repairs.map((r) => `- A \`${r.boxId}.tsx\` le falta: ${r.reason}`).join("\n")
      : "- Sin reparaciones de compliance pendientes.",
    "",
  ].join("\n");

  return [header, missingBlock, repairBlock].join("\n");
}

function main(): void {
  const caps = capabilityMap();
  const missing: MissingItem[] = [];
  const repairs: RepairItem[] = [];
  const catalog = FIFER_BLUEPRINT.boxCatalog.map((b) => ({
    boxId: b.boxId,
    sourceModule: b.sourceModule,
    targetSlot: b.targetSlot,
  }));

  for (const box of catalog) {
    const filePath = path.join(COMPONENTS_DIR, `${box.boxId}.tsx`);
    const exists = fs.existsSync(filePath);
    const capabilities = caps.get(box.boxId) ?? { isRefining: false, requiresPro: false, hasAIChat: false };

    if (!exists) {
      missing.push({
        boxId: box.boxId,
        sourceModule: box.sourceModule,
        targetSlot: box.targetSlot,
        capabilities,
      });
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    if (capabilities.isRefining && !/\bisRefining\b/.test(content)) {
      repairs.push({ boxId: box.boxId, reason: "manejar la prop `isRefining`." });
    }
    if (capabilities.requiresPro && !/(JITUpsellBanner|requiresPro|upsell)/i.test(content)) {
      repairs.push({ boxId: box.boxId, reason: "renderizar condición PRO (`JITUpsellBanner` o equivalente)." });
    }
  }

  const allGood = missing.length === 0 && repairs.length === 0;
  const out = allGood
    ? "Frontend 100% sincronizado con la arquitectura. No se requieren acciones en v0."
    : renderMarkdown(missing, repairs);

  fs.writeFileSync(OUT_FILE, out, "utf8");
  console.log(`[v0:audit] ${allGood ? "OK" : "issues-found"} -> ${OUT_FILE}`);
  console.log(`[v0:audit] missing=${missing.length} repairs=${repairs.length}`);
}

main();
export {};
