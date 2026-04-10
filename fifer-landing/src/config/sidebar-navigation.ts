/**
 * Navegación contextual — Chicureo / ABKupfer y rutas por defecto para favoritos (Boxes).
 */
import { moduleConfigs } from "@/modules";

/** Etiquetas amigables para favoritos en sidebar. */
export const BOX_FAVORITE_LABELS: Record<string, string> = {
  "fifer-finance-snapshot": "Snapshot Chicureo · UF",
  "fifer-content-pipeline": "Pipeline ABKupfer",
  "content-google-shopping": "Google Shopping · catálogo",
  "fifer-ingestor-feed": "Feed de ingestión",
  "fifer-vision-slot": "Vision Slot · plano / factura",
};

/** Ruta por defecto para abrir un Box conocido (mismo path que en `module.config`). */
export function defaultHrefForFavoriteBox(boxId: string): string {
  const map: Record<string, string> = {
    "fifer-finance-snapshot": "/finance/auditoria",
    "fifer-content-pipeline": "/content/generar",
    "content-google-shopping": "/content/generar",
    "fifer-ingestor-feed": "/dashboard",
    "fifer-vision-slot": "/dashboard",
  };
  return map[boxId] ?? "/dashboard";
}

export function labelForFavoriteBox(boxId: string): string {
  return BOX_FAVORITE_LABELS[boxId] ?? `Box · ${boxId}`;
}

/** Sección contextual: Proyectos Chicureo (finanzas / obra). */
export const CHICUREO_SECTION_ID = "chicureo-projects";

/** Sección contextual: inventario y canal (ABKupfer). */
export const ABKUPFER_SECTION_ID = "abkupfer-inventory";

export interface ContextualSidebarLink {
  href: string;
  label: string;
  description?: string;
}

export function getChicureoQuickLinks(): ContextualSidebarLink[] {
  const fin = moduleConfigs.find((m) => m.id === "finance");
  const base = fin?.routes[0]?.path ?? "/auditoria";
  return [
    {
      href: `/finance${base}`,
      label: "Auditoría y flujo",
      description: "UF, proyectos y regularización",
    },
    {
      href: `/finance${base}`,
      label: "Trámites municipales",
      description: "Seguimiento DOM y recepciones",
    },
  ];
}

export function getAbkupferQuickLinks(): ContextualSidebarLink[] {
  const c = moduleConfigs.find((m) => m.id === "content");
  const base = c?.routes[0]?.path ?? "/generar";
  return [
    {
      href: `/content${base}`,
      label: "Inventario y pipeline",
      description: "SKUs Roble / Pino",
    },
    {
      href: `/content${base}`,
      label: "Campañas y Shopping",
      description: "Google Shopping · Meta",
    },
  ];
}
