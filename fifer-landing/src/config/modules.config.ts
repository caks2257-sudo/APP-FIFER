import type { BoxRegistryId } from "@/types/box.types";

/** Módulo principal de la shell donde se componen las cajas del tablero. */
export const MAIN_DASHBOARD_MODULE_ID = "dashboard" as const;

/**
 * IDs de cajas registradas en `BOX_REGISTRY` que pertenecen al módulo Dashboard.
 */
export const DASHBOARD_BOX_IDS: readonly BoxRegistryId[] = [
  "stats-overview",
  "active-projects",
] as const;
