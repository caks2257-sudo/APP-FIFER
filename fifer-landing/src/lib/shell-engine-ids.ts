/**
 * IDs de motor registrados en `engineDispatcher` para el lienzo modular.
 * Finanzas / ingest (Chicureo): `scraper-engine`; contenido (ABKupfer): `content-engine`.
 * Ver `adaptEngineResultToBoxProps` en `utils/adapters/engine-bridge.ts`.
 */
export const SHELL_ENGINE_IDS = {
  finance: "scraper-engine",
  content: "content-engine",
} as const;
