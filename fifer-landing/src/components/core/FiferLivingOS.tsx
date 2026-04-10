/**
 * Master Shell — alias del lienzo Grid 12 + DnD (`PageOrchestrator`).
 *
 * Los datos de los Boxes **finance** (Chicureo) y **content** (ABKupfer) se normalizan vía
 * `adaptEngineResultToBoxProps` en `fifer-landing/src/utils/adapters/engine-bridge.ts`
 * (`SHELL_ENGINE_IDS`: scraper-engine ↔ finanzas, content-engine ↔ contenido).
 */
export { PageOrchestrator as FiferLivingOS } from "@/components/core/PageOrchestrator";
