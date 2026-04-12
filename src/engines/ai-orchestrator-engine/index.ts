import '@/engines/external-bridge-engine';

import { EngineRegistry } from '@/registry/engine-registry';

import { AiOrchestratorEngine } from './orchestrator';
import { AI_ORCHESTRATOR_ENGINE_ID } from './types';

const LOG_PREFIX = `[FIFER Engine ${AI_ORCHESTRATOR_ENGINE_ID}]`;

export * from './types';
export { AiOrchestratorEngine } from './orchestrator';
export { getAiOrchestratorHealth } from './health';

try {
  EngineRegistry.register(AI_ORCHESTRATOR_ENGINE_ID, new AiOrchestratorEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro:`, error);
}

try {
  void AI_ORCHESTRATOR_ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}
