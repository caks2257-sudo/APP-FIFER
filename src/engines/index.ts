import type { FiferNormalizedOutput, IFiferEngine } from "../types/fifer-engine";
import { ContentEngine } from "./ContentEngine";
import { ScraperEngine } from "./ScraperEngine";
import { ScrapingEngine } from "./ScrapingEngine";

export { BaseEngine } from "./BaseEngine";
export type { FiferDiscoveryReason, FiferEngineSerializableError } from "./discovery-types";
export { ContentEngine } from "./ContentEngine";
export type { ContentBoxResponseContract, ContentEngineContext, ContentEngineNormalized } from "./ContentEngine";
export { ScraperEngine } from "./ScraperEngine";
export type { IngestorProviderId, ScraperEnginePayload } from "./ScraperEngine";
export { ScrapingEngine } from "./ScrapingEngine";
export { FIFER_DEFAULT_USER_DNA } from "./user-dna-defaults";
export {
  ABKUPFER_CONTENT_KNOWLEDGE_BASE,
  buildProfessionalContextBlock,
  withProfessionalContext,
} from "./content-engine-context";

export class EngineDispatcher {
  private readonly registry = new Map<string, IFiferEngine>();

  register(engine: IFiferEngine): void {
    if (!engine?.engineId) {
      throw new Error("Engine must expose a valid engineId.");
    }

    this.registry.set(engine.engineId, engine);
  }

  unregister(engineId: string): boolean {
    return this.registry.delete(engineId);
  }

  has(engineId: string): boolean {
    return this.registry.has(engineId);
  }

  listEngineIds(): string[] {
    return Array.from(this.registry.keys());
  }

  async dispatch<TPayload, TResult extends FiferNormalizedOutput>(
    engineId: string,
    payload: TPayload
  ): Promise<TResult> {
    const engine = this.registry.get(engineId);

    if (!engine) {
      throw new Error(`Engine "${engineId}" is not registered.`);
    }

    return engine.execute<TPayload, TResult>(payload);
  }
}

export const engineDispatcher = new EngineDispatcher();
export const GlobalEngineRegistry = {
  scraping: new ScrapingEngine(),
  scraper: new ScraperEngine(),
  content: new ContentEngine(),
} as const;

for (const engine of Object.values(GlobalEngineRegistry)) {
  engineDispatcher.register(engine);
}
