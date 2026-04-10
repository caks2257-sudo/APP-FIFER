/**
 * Entrada por módulo ROI — namespaces para no chocar con el barrel plano de `boxes/`.
 * Uso: `import { finance } from "@/components/v0-ingestion/modules"` → `finance.FiferFinanceSnapshotV0`.
 */
export * as finance from "./finance";
export * as content from "./content";
export * as ingestor from "./ingestor";
