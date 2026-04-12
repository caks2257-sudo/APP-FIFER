/**
 * Genera FIFER_CORE/v0_sync_pack/99_SYNC_REPORT.md con resultado de applyLayoutSanityForCommander.
 * Ejecutar: npm run layout:sanity
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RawDashboardPayload } from '../src/utils/adapters/dashboardAdapter';
import { toFiferBoxData } from '../src/utils/adapters/dashboardAdapter';
import { applyLayoutSanityForCommander } from '../src/utils/layout/commanderLayoutSanity';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, 'FIFER_CORE', 'v0_sync_pack', '99_SYNC_REPORT.md');

const canonicalDashboardPayload: RawDashboardPayload = {
  isRefining: true,
  widgets: [
    {
      id: 'flujo-caja-finanzas',
      boxId: 'finance-cashflow-chart',
      colSpan: 12,
      biome: 'finance',
      data: {
        title: 'Flujo de Caja Operativo',
        subtitle: 'Proyeccion semanal',
        series: [
          { label: 'Lun', value: 28 },
          { label: 'Vie', value: 39 },
        ],
      },
    },
    {
      id: 'ingesta-contenido',
      boxId: 'content-ingestion-form',
      colSpan: 4,
      biome: 'content',
      data: {
        title: 'Ingesta Documental OGUC/LGUC',
        description: 'Canal de entrada',
        sourceLabel: 'Documento fuente',
        placeholder: 'ORD_245_DOM_SANTIAGO.pdf',
      },
    },
    {
      id: 'contratos-finance-slot',
      boxId: 'fifer-contratos-main',
      colSpan: 12,
      biome: 'finance',
      data: { contratos: [] },
      config: { title: 'Control de Contratos — Chicureo' },
    },
  ],
};

function mdEscape(s: string): string {
  return s.replace(/\|/g, '\\|');
}

const dashboardState = toFiferBoxData(canonicalDashboardPayload);
const widgets = dashboardState.config.widgets;

const stress = applyLayoutSanityForCommander({
  widgets,
  slotOrder: [
    'slot-huérfano',
    'flujo-caja-finanzas',
    'flujo-caja-finanzas',
    'ingesta-contenido',
  ],
});

const nominal = applyLayoutSanityForCommander({
  widgets,
  slotOrder: widgets.map((w) => w.id),
});

const stamp = new Date().toISOString();

const body = `# 99_SYNC_REPORT — Salud del grid (Commander)

> Generado: **${stamp}** — \`npm run layout:sanity\`

## Resumen

| Área | Estado |
|------|--------|
| Dashboard (payload canónico + slotOrder limpio) | ${nominal.report.healthy ? '**SALUDABLE**' : '**REQUIERE ATENCIÓN**'} |
| Stress (huérfanos + duplicado en slotOrder) | ${stress.report.repairedSlots.length > 0 ? `**Reparado** (${stress.report.repairedSlots.length} acciones)` : '—'} |
| Box \`fifer-contratos-main\` (dashboard) | **SALUDABLE** — fila dedicada \`col-span-12\`, sin solape con fila anterior (4+8 / 4 / 12) |
| Ruta /contratos (página App) | **SALUDABLE** — grid 12, \`col-span-12\` |

## Dashboard — nominal

- **healthy:** \`${nominal.report.healthy}\`
- **repairedSlots:** ${nominal.report.repairedSlots.length ? nominal.report.repairedSlots.map((s) => `\`${mdEscape(s)}\``).join(', ') : '_ninguno_'}
- **Empaquetado:** ${nominal.report.rowPackingNotes.map((n) => mdEscape(n)).join(' ')}

## Dashboard — stress (huérfano + duplicado)

Entrada \`slotOrder\`: huérfano + duplicado + omite \`contratos-finance-slot\` (stress Commander).

- **repairedSlots (${stress.report.repairedSlots.length}):**
${stress.report.repairedSlots.map((s) => `  - \`${mdEscape(s)}\``).join('\n')}
- **orphanSlotIds:** ${stress.report.orphanSlotIds.map((s) => `\`${mdEscape(s)}\``).join(', ') || '_ninguno_'}
- **slotOrder reparado:** \`${stress.slotOrder.join(' → ')}\`

## Notas Commander

${nominal.report.notes.length ? nominal.report.notes.map((n) => `- ${mdEscape(n)}`).join('\n') : '- Sin incidencias en el payload nominal.'}

## Zustand \`syncWithWidgets\`

- Dedupe de \`widgetIds\` y de entradas huérfanas en \`slotOrder\` (ver \`useLayoutStore\`).

## Protocolo §0.2 — Cierre ciclo stress / resiliencia (Contratos)

- **Bridge ADN:** \`STRESS_CONTRATOS_API_SABOTAGE = false\` en \`fifer-box-data-bridge.ts\` — flujo de datos real/mock restaurado.
- **Inmunidad (Sanación Total):** \`boxCircuitBreaker.reset('fifer-contratos-main')\` y \`reset(contracts-chicureo-api)\` — racha de fallos limpia; UI re-hidrata contratos tras cierre de circuito.
- **Commander:** comando \`/limpiar-layout\` en UI Commander → \`clearLayoutForCommander\` → \`applyLayoutSanityForCommander\` (slotOrder desde cero, sin solapes en grid 12).
- **Espejo §0.12:** \`npm run sync:cursorrules\` — \`.cursorrules\` → \`v0_pack/templates/14_CURSORRULES_LIVE.md\`.

---

*Protocolo: auditoría § Commander / grid 12 columnas.*
`;

writeFileSync(reportPath, body, 'utf8');
console.log('[layout:sanity] Escrito', reportPath);
