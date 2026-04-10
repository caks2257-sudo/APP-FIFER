import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");
const { FIFER_BLUEPRINT } = require("../src/registry/master-blueprint") as {
  FIFER_BLUEPRINT: typeof import("../src/registry/master-blueprint").FIFER_BLUEPRINT;
};

type Blueprint = typeof FIFER_BLUEPRINT;

function renderHeader(): string {
  const generatedAt = new Date().toISOString();
  return [
    "> 🤖 ARCHIVO AUTO-GENERADO POR EL SISTEMA FIFER. NO EDITAR MANUALMENTE. Fuente de Verdad: master-blueprint.ts",
    `> Fecha de generación: ${generatedAt}`,
    "",
  ].join("\n");
}

function renderAdnVisual(blueprint: Blueprint): string {
  const t = blueprint.uiTokens;
  return [
    "## SECCIÓN 1: ADN VISUAL & CHASIS",
    "",
    `- Deep Navy: \`${t.deepNavy}\``,
    `- Electric Yellow: \`${t.electricYellow}\``,
    `- Slate Gray (Text Secondary): \`${t.slateGray}\``,
    `- Emerald (Finance Module): \`${t.financeEmerald}\``,
    `- Border Radius: \`${t.borderRadius}\``,
    `- Grid canónico: \`${t.gridCols}\` columnas`,
    `- Sidebar: \`${t.layout.sidebarExpandedPx}px\` expandido / \`${t.layout.sidebarCollapsedPx}px\` colapsado`,
    `- Gap entre cajas: \`${t.layout.dashboardGap}\``,
    `- Responsiveness: mobile \`grid-cols-${t.layout.responsiveCols.mobile}\`, tablet \`grid-cols-${t.layout.responsiveCols.tablet}\`, desktop \`grid-cols-${t.layout.responsiveCols.desktop}\``,
    `- Z-Index: backdrop \`${t.zIndex.backdrop}\`, modal \`${t.zIndex.modal}\`, popover \`${t.zIndex.popover}\``,
    `- Glassmorphism (floating): \`${t.surfaceStyles.glassmorphism}\``,
    `- Border de panel oscuro: \`${t.surfaceStyles.panelBorder}\``,
    "",
    "**Regla de implementación visual:** está estrictamente prohibido usar CSS puro o CSS Modules en UI de producto; se usa Tailwind como estándar del chasis.",
    "",
  ].join("\n");
}

function renderShellProtocol(): string {
  const p = FIFER_BLUEPRINT.boxProtocol;
  return [
    "## SECCIÓN 2: PROTOCOLO SHELL & DUAL-STAGE AI",
    "",
    `- **Hidratación:** ${p.hydration}.`,
    `- **Interface obligatoria en todos los Boxes:** \`${p.interface.join(", ")}\`.`,
    `- **isRefining:** ${p.states.isRefining}`,
    `- **isLoading:** ${p.states.isLoading}`,
    `- **isLocked:** ${p.states.isLocked}`,
    `- **hasError:** ${p.states.hasError}`,
    "- **Regla `JITUpsellBanner`:** para usuarios gratuitos que intentan calidad de estudio (`requiresPro=true`), el shell debe mostrar upsell antes de ejecutar flujo premium.",
    "",
  ].join("\n");
}

function renderModulesTable(blueprint: Blueprint): string {
  const rows = blueprint.modules
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => `| \`${m.id}\` | \`${m.biomePrimary}\` | \`${m.biomeAccent}\` | ${m.slots.map((s) => `\`${s}\``).join(", ")} |`);
  return [
    "## SECCIÓN 3: MÓDULOS Y BIOMAS",
    "",
    "| ID Módulo | Color Primario | Color Acento | Slots disponibles |",
    "|----------|----------------|--------------|-------------------|",
    ...rows,
    "",
  ].join("\n");
}

function renderBoxInventory(blueprint: Blueprint): string {
  const rows = blueprint.boxCatalog
    .slice()
    .sort((a, b) => a.boxId.localeCompare(b.boxId))
    .map(
      (b) =>
        `| \`${b.boxId}\` | \`${b.sourceModule}\` | \`${b.targetSlot}\` | ${b.layout.minWidth}x${b.layout.minHeight} | ${
          b.capabilities.isRefining ? "true" : "false"
        } | ${b.capabilities.requiresPro ? "true" : "false"} | ${b.capabilities.hasAIChat ? "true" : "false"} |`
    );
  return [
    "## SECCIÓN 4: CATÁLOGO DE FIFER BOXES",
    "",
    "| Box ID | Módulo Origen | Target Slot | Layout Mínimo | isRefining | requiresPro | hasAIChat |",
    "|--------|---------------|-------------|---------------|------------|-------------|-----------|",
    ...rows,
    "",
  ].join("\n");
}

function renderMarkdown(blueprint: Blueprint): string {
  return [
    "# 00_FIFER_MASTER_BLUEPRINT",
    "",
    renderHeader(),
    renderAdnVisual(blueprint),
    renderShellProtocol(),
    renderModulesTable(blueprint),
    renderBoxInventory(blueprint),
  ].join("\n");
}

function main(): void {
  const fiferLandingRoot = process.cwd();
  const repoRoot = path.resolve(fiferLandingRoot, "..");
  const outFile = path.join(repoRoot, "00_FIFER_MASTER_BLUEPRINT.md");
  fs.writeFileSync(outFile, renderMarkdown(FIFER_BLUEPRINT), "utf8");
  console.log(`[fifer:sync] generated ${path.relative(repoRoot, outFile)}`);
}

main();
export {};
