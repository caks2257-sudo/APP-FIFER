/**
 * Sub-Engine `dom-engine:normative-analyzer` — cabida OGUC/LGUC vía IA (Bridge: OpenAI / Anthropic).
 */

import type { DomAnalisisRequest, DomAnalisisResponse } from '@/types/schemas';
import { EngineRegistry } from '@/registry/engine-registry';

import { analyzeNormativeCabida as runCabida } from './analyzer';

const SUB_ENGINE_ID = 'dom-engine:normative-analyzer' as const;
const LOG_PREFIX = `[FIFER SubEngine ${SUB_ENGINE_ID}]`;

export type NormativeAnalyzerSubEngineApi = {
  readonly id: typeof SUB_ENGINE_ID;
  runAnalysis: (
    input: DomAnalisisRequest,
    vault?: Partial<Record<string, string>>,
  ) => Promise<DomAnalisisResponse>;
  getHealthStatus: () => { ok: boolean; id: string };
};

class NormativeAnalyzerSubEngine implements NormativeAnalyzerSubEngineApi {
  readonly id = SUB_ENGINE_ID;

  runAnalysis(input: DomAnalisisRequest, vault?: Partial<Record<string, string>>) {
    return runCabida(input, vault);
  }

  getHealthStatus(): { ok: boolean; id: string } {
    return { ok: true, id: SUB_ENGINE_ID };
  }
}

try {
  EngineRegistry.register(SUB_ENGINE_ID, new NormativeAnalyzerSubEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro:`, error);
}

try {
  void SUB_ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}
