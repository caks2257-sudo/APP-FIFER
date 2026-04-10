/**
 * Mapa boxId → chunk dinámico. Añade aquí cada pieza que pegues desde v0.
 * Los imports son estáticos para que el bundler genere un chunk por Box.
 */
import type { ComponentType } from "react";
import type { FiferV0BoxProps } from "./types";

export type { FiferV0BoxProps };

export const V0_BOX_REGISTRY: Record<string, () => Promise<{ default: ComponentType<FiferV0BoxProps> }>> = {
  "fifer-content-pipeline": () => import("./boxes/fifer-content-pipeline"),
  "fifer-finance-snapshot": () => import("./boxes/fifer-finance-snapshot"),
  "fifer-ingestor-feed": () => import("./boxes/fifer-ingestor-feed"),
};

export function loadV0BoxModule(boxId: string) {
  const loader = V0_BOX_REGISTRY[boxId];
  if (loader) return loader();
  return import("./boxes/unknown-box");
}
