import fs from "node:fs";
import path from "node:path";
import { FIFER_BOX_CATALOG } from "../src/registry/box-catalog";
import { MASTER_MODULE_REGISTRY } from "../src/registry/module-registry";

type ModuleEntry = (typeof MASTER_MODULE_REGISTRY)[number];

function buildBiomeTable(moduleCfg: ModuleEntry): string {
  const biomePrimary = moduleCfg.biome?.primary ?? "-";
  const biomeAccent = moduleCfg.biome?.accent ?? "-";
  const rows = [
    `| \`biomePrimary\` | \`${biomePrimary}\` |`,
    `| \`biomeAccent\` | \`${biomeAccent}\` |`,
  ];
  return [
    "| Token | Valor |",
    "|-------|-------|",
    ...rows,
  ].join("\n");
}

function buildCatalogSection(moduleId: string): string {
  const manifests = FIFER_BOX_CATALOG
    .filter((m) => m.sourceModule === moduleId)
    .sort((a, b) => a.boxId.localeCompare(b.boxId));
  if (!manifests.length) {
    return "_Sin manifiestos en `FIFER_BOX_CATALOG` para este módulo._";
  }
  const rows = manifests
    .map(
      (m) =>
        `| \`${m.boxId}\` | \`${m.targetSlot}\` | ${m.layout.minWidth} x ${m.layout.minHeight} | ${
          m.layout.isResizable ? "si" : "no"
        } |`
    )
    .join("\n");
  return [
    "| boxId | targetSlot | dimensiones (w x h) | resizable |",
    "|------|------------|---------------------|-----------|",
    rows,
  ].join("\n");
}

function renderModuleXray(moduleId: string, moduleCfg: ModuleEntry): string {
  return [
    "> 🤖 AUTO-GENERATED FILE: DO NOT EDIT MANUALLY.",
    "",
    `# X-Ray v0 local — ${moduleCfg.nombre} (\`${moduleId}\`)`,
    "",
    "> Fuente de verdad: `MASTER_MODULE_REGISTRY` + `FIFER_BOX_CATALOG`.",
    "",
    "## Bioma y Acento (detectados desde código)",
    "",
    buildBiomeTable(moduleCfg),
    "",
    "## Cajas del módulo (filtradas del catálogo central)",
    "",
    buildCatalogSection(moduleId),
    "",
  ].join("\n");
}

function main(): void {
  const projectRoot = process.cwd();
  for (const moduleCfg of MASTER_MODULE_REGISTRY) {
    const moduleId = moduleCfg.id;
    const outFile = path.join(projectRoot, "src", "modules", moduleId, "_xray_v0_local.md");
    const markdown = renderModuleXray(moduleId, moduleCfg);
    fs.writeFileSync(outFile, markdown, "utf8");
    console.log(`[docs:sync] generated ${path.relative(projectRoot, outFile)}`);
  }
}

main();
