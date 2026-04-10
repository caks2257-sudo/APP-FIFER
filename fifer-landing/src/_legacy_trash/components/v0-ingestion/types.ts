import type { IFiferBoxManifest } from "@/types/fifer-box";

/** Props que recibe el default export de cada módulo en `v0-ingestion/boxes/` (socket v0). */
export type FiferV0BoxProps = {
  manifest: IFiferBoxManifest;
} & Record<string, unknown>;
