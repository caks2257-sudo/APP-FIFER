/**
 * Puente Data Weaver ↔ motores experimentales del user_space: mismas reglas que
 * `weaveModuleData` en el monorepo, con `source: "experimental"` para trazabilidad ROI/exactitud.
 */

import type { WeaverModuleSlice } from "../../../src/core/dataWeaver";

export function experimentalEngineWeaverSlice(
  boxId: string,
  rows: Record<string, unknown>[]
): WeaverModuleSlice {
  return {
    moduleId: boxId,
    source: "experimental",
    rows,
  };
}

/**
 * Construye slices a partir de ejecuciones recientes por `boxId` (p. ej. resultados de `execute()`
 * serializados como filas tabulares) para comparar motores antes de promoción al Core.
 */
export function experimentalEngineSlicesFromResults(
  resultsByBoxId: Record<string, Record<string, unknown>[]>
): WeaverModuleSlice[] {
  return Object.entries(resultsByBoxId).map(([boxId, rows]) => experimentalEngineWeaverSlice(boxId, rows));
}
