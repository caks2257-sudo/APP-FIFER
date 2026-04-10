import type { ComponentType } from "react";
import type { BoxProps } from "@/types/fifer-box";

export type V0BoxModuleLoader = () => Promise<{ default: ComponentType<BoxProps> }>;

/**
 * Mapa JIT: `boxId` → import dinámico del Box v0.
 * Metadatos declarativos: `src/registry/box-catalog.ts`.
 * Persona IA (FIFER OS Core): `ai-persona.ts` + `docs/ai_persona.md`.
 */
export const V0_BOX_LOADERS: Partial<Record<string, V0BoxModuleLoader>> = {
  "fifer-dom-evaluator": () => import("./fifer-dom-evaluator"),
  "fifer-finance-snapshot": () => import("./boxes/fifer-finance-snapshot"),
  "finance-cashflow-chart": () => import("./boxes/finance-uf-card"),
  "finance-transactions-grid": () => import("./boxes/fifer-finance-snapshot"),
  "fifer-content-pipeline": () => import("./boxes/fifer-content-pipeline"),
  "content-google-shopping": () => import("./boxes/fifer-content-pipeline"),
  "content-ingestion-form": () => import("./boxes/fifer-content-pipeline"),
  "asset-gallery": () => import("./boxes/fifer-vision-slot"),
  "fifer-ingestor-feed": () => import("./boxes/fifer-ingestor-feed"),
  "fifer-vision-slot": () => import("./boxes/fifer-vision-slot"),
  "affiliate-hero-summary": () => import("./boxes/affiliate-slot-shell"),
  "affiliate-kpi-grid": () => import("./boxes/affiliate-slot-shell"),
  "affiliate-offers-table": () => import("./boxes/affiliate-slot-shell"),
  "logistics-status-fleet": () => import("./boxes/logistics-status-fleet"),
  "logistics-delivery-map": () => import("./boxes/logistics-delivery-map"),
  "scraping-url-box": () => import("./ScrapingUrlBox"),
  "data-canvas-box": () => import("./DataCanvasBox"),
  "resizable-split-layout-box": () =>
    import("./ResizableSplitLayoutBox") as Promise<{ default: ComponentType<BoxProps> }>,
};

export function getV0BoxLoader(boxId: string): V0BoxModuleLoader | null {
  return V0_BOX_LOADERS[boxId] ?? null;
}
