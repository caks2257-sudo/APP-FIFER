import { BoxManifestSchema, type BoxManifest } from './box-manifest.schema';

/**
 * Genoma core: manifiestos validados con `BoxManifestSchema`.
 * Añadir nuevas entradas aquí y sincronizar `box-catalog.ts` (BOX_CATALOG).
 */
const RAW_MANIFESTS: unknown[] = [
  {
    boxId: 'system-health-monitor',
    module: 'system',
    minWidth: 6,
    minHeight: 3,
    biome: {
      primary: '#ef4444',
      accent: '#EAB308',
    },
    permissions: ['system:admin'],
    component: 'system-monitor',
    defaultDimensions: { w: 6, h: 3 },
    isResizable: false,
    isDraggable: true,
  },
  {
    boxId: 'finance-cashflow-chart',
    module: 'finance',
    minWidth: 6,
    minHeight: 3,
    biome: { primary: '#10B981', accent: '#EAB308' },
    permissions: [],
    component: 'chart-box',
    defaultDimensions: { w: 12, h: 2 },
    isResizable: true,
    isDraggable: true,
  },
  {
    boxId: 'finance-liquidity-forecast',
    module: 'finance',
    minWidth: 6,
    minHeight: 4,
    biome: { primary: '#0A0F1E', accent: '#EAB308' },
    permissions: [],
    component: 'liquidity-forecast-box',
    defaultDimensions: { w: 6, h: 4 },
    isResizable: true,
    isDraggable: true,
  },
  {
    boxId: 'fifer-contratos-main',
    module: 'finance',
    minWidth: 6,
    minHeight: 3,
    isResizable: true,
    biome: { primary: '#10B981', accent: '#EAB308' },
    permissions: ['finance:contratos:read'],
    component: 'contratos-main',
    defaultDimensions: { w: 12, h: 3 },
    isDraggable: true,
  },
  {
    boxId: 'content-ingestion-form',
    module: 'content',
    minWidth: 4,
    minHeight: 3,
    biome: { primary: '#3B82F6', accent: '#EAB308' },
    permissions: [],
    component: 'activity-box',
    defaultDimensions: { w: 4, h: 3 },
    isResizable: true,
    isDraggable: true,
  },
  {
    boxId: 'fifer-inmobiliario-main',
    module: 'inmobiliario',
    minWidth: 6,
    minHeight: 3,
    biome: { primary: '#0F172A', accent: '#EAB308' },
    permissions: [],
    component: 'inmobiliario-main',
    defaultDimensions: { w: 12, h: 3 },
    isResizable: true,
    isDraggable: true,
  },
  {
    boxId: 'fifer-misbots-main',
    module: 'bots',
    minWidth: 6,
    minHeight: 3,
    biome: { primary: '#312E81', accent: '#EAB308' },
    permissions: [],
    component: 'misbots-main',
    defaultDimensions: { w: 12, h: 3 },
    isResizable: true,
    isDraggable: true,
  },
  {
    boxId: 'ai-orchestrator-box',
    module: 'system',
    minWidth: 6,
    minHeight: 4,
    biome: { primary: '#0A0F1E', accent: '#EAB308' },
    permissions: ['system:admin'],
    component: 'ai-orchestrator-box',
    defaultDimensions: { w: 12, h: 4 },
    isResizable: true,
    isDraggable: true,
  },
];

export const FIFER_BOX_CATALOG: BoxManifest[] = RAW_MANIFESTS.map((raw) =>
  BoxManifestSchema.parse(raw),
);

export const FIFER_BOX_CATALOG_BY_ID: Record<string, BoxManifest> = Object.fromEntries(
  FIFER_BOX_CATALOG.map((m) => [m.boxId, m]),
);
