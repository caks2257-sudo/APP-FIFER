/**
 * Catálogo central FIFER — `FIFER_BOX_CATALOG` (array validado con Zod) + `BOX_CATALOG` (metadatos UI).
 * Fase 2: `z.array(BoxManifestSchema).parse(...)` asegura validez estricta al iniciar la app.
 */

import { BoxManifestSchema, type BoxManifest } from "@/schema/registry.schema";
import type { ResizableSplitLayoutBoxProps } from "@/components/v0-ingestion/ResizableSplitLayoutBox";
import type { IFiferBoxManifest } from "@/types/fifer-box";
import { z } from "zod";

export type BoxVariant = "Mini" | "Standard" | "Hero";

export interface BoxCatalogEntry {
  id: string;
  /** Densidad visual por defecto al hidratar sin manifiesto. */
  variant: BoxVariant;
  hasAIChat: boolean;
  isDraggable: boolean;
  /** Orquestador / layout: permitir resize en grid. */
  isResizable?: boolean;
}

type ResizableSplitRequiredProp = keyof Pick<
  ResizableSplitLayoutBoxProps,
  "leftBoxId" | "rightBoxId"
>;

const RESIZABLE_SPLIT_REQUIRED_PROPS = ["leftBoxId", "rightBoxId"] as const satisfies readonly ResizableSplitRequiredProp[];

/** Fase 2 — 2 cajas mock por módulo (finanzas, contenido, afiliados). */
export const FIFER_BOX_CATALOG: ReadonlyArray<BoxManifest> = Object.freeze(
  z.array(BoxManifestSchema).parse([
    {
    boxId: "fifer-finance-snapshot",
    sourceModule: "finance",
    targetSlot: "slot-main",
    layout: { minWidth: 4, minHeight: 2, isResizable: true },
    themeOverrides: {
      primary: "#059669",
      accent: "#D97706",
      surface: "#18181B",
      onPrimary: "#0A0F1E",
    },
    permissions: ["finance:read"],
    },
    {
    boxId: "finance-cashflow-chart",
    sourceModule: "finance",
    targetSlot: "slot-stats-grid",
    layout: { minWidth: 6, minHeight: 2 },
    themeOverrides: {
      primary: "#059669",
      accent: "#F59E0B",
      surface: "#0f172a",
    },
    },
    {
    boxId: "fifer-content-pipeline",
    sourceModule: "content",
    targetSlot: "slot-main",
    layout: { minWidth: 6, minHeight: 3, isResizable: true },
    themeOverrides: {
      primary: "#2563EB",
      accent: "#EAB308",
      surface: "#18181B",
    },
    permissions: ["content:write"],
    },
    {
    boxId: "content-google-shopping",
    sourceModule: "content",
    targetSlot: "slot-stats-grid",
    layout: { minWidth: 4, minHeight: 2 },
    themeOverrides: {
      primary: "#1E3A5F",
      accent: "#38BDF8",
      surface: "#0c1220",
    },
    },
    {
    boxId: "affiliate-hero-summary",
    sourceModule: "affiliates",
    targetSlot: "slot-main",
    layout: { minWidth: 6, minHeight: 2, isResizable: true },
    themeOverrides: {
      primary: "#EAB308",
      accent: "#2563EB",
      surface: "#18181B",
      onPrimary: "#0A0F1E",
    },
    },
    {
    boxId: "affiliate-offers-table",
    sourceModule: "affiliates",
    targetSlot: "slot-stats-grid",
    layout: { minWidth: 6, minHeight: 3 },
    themeOverrides: {
      primary: "#EAB308",
      accent: "#22C55E",
      surface: "#18181B",
    },
    permissions: ["affiliates:read"],
    },
    {
    boxId: "logistics-status-fleet",
    sourceModule: "logistics",
    targetSlot: "slot-main",
    layout: { minWidth: 6, minHeight: 2, isResizable: true },
    themeOverrides: {
      primary: "#1D4ED8",
      accent: "#64748B",
      surface: "#0F172A",
      onPrimary: "#F8FAFC",
    },
    permissions: ["logistics:read"],
    },
    {
    boxId: "logistics-delivery-map",
    sourceModule: "logistics",
    targetSlot: "slot-stats-grid",
    layout: { minWidth: 6, minHeight: 2, isResizable: true },
    themeOverrides: {
      primary: "#1D4ED8",
      accent: "#64748B",
      surface: "#0F172A",
      onPrimary: "#F8FAFC",
    },
    permissions: ["logistics:read"],
    },
    {
    boxId: "scraping-url-box",
    sourceModule: "scraping",
    targetSlot: "slot-main",
    layout: { minWidth: 6, minHeight: 2, isResizable: true },
    themeOverrides: {
      primary: "#22D3EE",
      accent: "#6366F1",
      surface: "#0B1120",
      onPrimary: "#F8FAFC",
    },
    permissions: ["scraping:run"],
    },
    {
    boxId: "data-canvas-box",
    sourceModule: "scraping",
    targetSlot: "slot-main",
    layout: { minWidth: 6, minHeight: 3, isResizable: true },
    themeOverrides: {
      primary: "#2563EB",
      accent: "#22D3EE",
      surface: "#0A0F1E",
      onPrimary: "#F8FAFC",
    },
    permissions: ["scraping:run"],
    },
    {
    boxId: "resizable-split-layout-box",
    sourceModule: "scraping",
    targetSlot: "slot-main",
    layout: { minWidth: 6, minHeight: 3, isResizable: true },
    propsSchema: {
      type: "object",
      required: [...RESIZABLE_SPLIT_REQUIRED_PROPS],
      properties: {
        leftBoxId: { type: "string" },
        rightBoxId: { type: "string" },
      },
    },
    },
  ])
);

/** Lookup rápido por `boxId` para runtime. */
export const FIFER_BOX_CATALOG_BY_ID: Readonly<Record<string, BoxManifest>> = Object.freeze(
  Object.fromEntries(FIFER_BOX_CATALOG.map((m) => [m.boxId, m]))
);

export function getFiferBoxManifest(boxId: string): BoxManifest | undefined {
  return FIFER_BOX_CATALOG_BY_ID[boxId];
}

/**
 * Mapa boxId → metadatos UI. Mantener sincronizado con `V0_BOX_LOADERS` en
 * `src/components/v0-ingestion/registry.ts`. Los `boxId` del núcleo deben existir en `FIFER_BOX_CATALOG`.
 */
export const BOX_CATALOG: Record<string, BoxCatalogEntry> = {
  "fifer-finance-snapshot": {
    id: "fifer-finance-snapshot",
    variant: "Standard",
    hasAIChat: true,
    isDraggable: true,
  },
  "fifer-content-pipeline": {
    id: "fifer-content-pipeline",
    variant: "Hero",
    hasAIChat: true,
    isDraggable: true,
  },
  "content-google-shopping": {
    id: "content-google-shopping",
    variant: "Standard",
    hasAIChat: true,
    isDraggable: true,
  },
  "fifer-ingestor-feed": {
    id: "fifer-ingestor-feed",
    variant: "Mini",
    hasAIChat: false,
    isDraggable: true,
  },
  "fifer-vision-slot": {
    id: "fifer-vision-slot",
    variant: "Hero",
    hasAIChat: true,
    isDraggable: true,
    isResizable: true,
  },
  "affiliate-hero-summary": {
    id: "affiliate-hero-summary",
    variant: "Hero",
    hasAIChat: true,
    isDraggable: true,
    isResizable: true,
  },
  "affiliate-kpi-grid": {
    id: "affiliate-kpi-grid",
    variant: "Standard",
    hasAIChat: false,
    isDraggable: true,
    isResizable: true,
  },
  "affiliate-offers-table": {
    id: "affiliate-offers-table",
    variant: "Standard",
    hasAIChat: true,
    isDraggable: true,
    isResizable: true,
  },
  "finance-cashflow-chart": {
    id: "finance-cashflow-chart",
    variant: "Standard",
    hasAIChat: false,
    isDraggable: true,
    isResizable: true,
  },
  "finance-transactions-grid": {
    id: "finance-transactions-grid",
    variant: "Standard",
    hasAIChat: true,
    isDraggable: true,
    isResizable: true,
  },
  "global-kpi-summary": {
    id: "global-kpi-summary",
    variant: "Standard",
    hasAIChat: false,
    isDraggable: true,
    isResizable: true,
  },
  "system-ia-insights": {
    id: "system-ia-insights",
    variant: "Standard",
    hasAIChat: true,
    isDraggable: true,
    isResizable: true,
  },
  "content-ingestion-form": {
    id: "content-ingestion-form",
    variant: "Standard",
    hasAIChat: true,
    isDraggable: true,
    isResizable: true,
  },
  "asset-gallery": {
    id: "asset-gallery",
    variant: "Mini",
    hasAIChat: false,
    isDraggable: true,
    isResizable: true,
  },
  "logistics-status-fleet": {
    id: "logistics-status-fleet",
    variant: "Standard",
    hasAIChat: false,
    isDraggable: true,
    isResizable: true,
  },
  "logistics-delivery-map": {
    id: "logistics-delivery-map",
    variant: "Standard",
    hasAIChat: false,
    isDraggable: true,
    isResizable: true,
  },
  "scraping-url-box": {
    id: "scraping-url-box",
    variant: "Standard",
    hasAIChat: true,
    isDraggable: true,
    isResizable: true,
  },
  "data-canvas-box": {
    id: "data-canvas-box",
    variant: "Standard",
    hasAIChat: false,
    isDraggable: true,
    isResizable: true,
  },
  "resizable-split-layout-box": {
    id: "resizable-split-layout-box",
    variant: "Hero",
    hasAIChat: false,
    isDraggable: true,
    isResizable: true,
  },
};

export function getBoxCatalogEntry(boxId: string): BoxCatalogEntry | undefined {
  return BOX_CATALOG[boxId];
}

/** True si `boxId` tiene entrada en `BOX_CATALOG` (Living OS / escalabilidad orgánica). */
export function isBoxRegisteredInCatalog(boxId: string): boolean {
  return Object.prototype.hasOwnProperty.call(BOX_CATALOG, boxId);
}

/**
 * Manifiesto mínimo para metadata o prompts: prioriza `FIFER_BOX_CATALOG` si existe.
 */
export function suggestBaseManifest(
  boxId: string,
  sourceModule: string,
  targetSlot: string
): IFiferBoxManifest {
  const fromCore = FIFER_BOX_CATALOG_BY_ID[boxId];
  if (fromCore) {
    return fromCore;
  }
  return {
    boxId,
    sourceModule,
    targetSlot,
    layout: { minWidth: 4, minHeight: 1 },
  };
}

/** Fragmento TS listo para añadir dentro de `BOX_CATALOG`. */
export function suggestCatalogEntrySnippet(boxId: string, variant: BoxVariant = "Standard"): string {
  return `  "${boxId}": {
    id: "${boxId}",
    variant: "${variant}",
    hasAIChat: false,
    isDraggable: true,
  },`;
}

export function listRegisteredBoxIds(): string[] {
  return Object.keys(BOX_CATALOG);
}

/** Ids con manifiesto validado en `FIFER_BOX_CATALOG`. */
export function listFiferCoreBoxIds(): string[] {
  return FIFER_BOX_CATALOG.map((m) => m.boxId);
}
