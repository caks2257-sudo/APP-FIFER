import type { IFiferBoxManifest } from "@/types/fifer-box";
import manifestContentJson from "@/components/core/manifests/manifest-content-pipeline.json";
import manifestFinanceJson from "@/components/core/manifests/manifest-finance-snapshot.json";
import manifestIngestorJson from "@/components/core/manifests/manifest-ingestor-feed.json";

/**
 * Manifiestos del Command Center — **fuente de verdad**: JSON estático en `core/manifests/*.json`
 * (anclaje v0 + `permissionScopes`). Misma forma que `IFiferBoxManifest`.
 */
export const boxManifestContent: IFiferBoxManifest = manifestContentJson as IFiferBoxManifest;
export const boxManifestFinance: IFiferBoxManifest = manifestFinanceJson as IFiferBoxManifest;
export const boxManifestIngestor: IFiferBoxManifest = manifestIngestorJson as IFiferBoxManifest;
