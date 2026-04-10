import { ScraperEngine } from "./ScraperEngine";

/**
 * Alias de compatibilidad: mismo comportamiento que `ScraperEngine` con `engineId` legacy `scraping-engine`
 * (registro previo en `engineDispatcher` / `useFiferEngine`).
 */
export class ScrapingEngine extends ScraperEngine {
  public override readonly engineId = "scraping-engine";
}

export type { ScraperEnginePayload as ScrapingEnginePayload } from "./ScraperEngine";
