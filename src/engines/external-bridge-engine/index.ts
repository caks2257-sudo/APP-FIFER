/**
 * Motor `external-bridge-engine` — orquestación segura de APIs externas (§12).
 */

import {
  ENGINE_ID,
  ExternalBridgeEngine,
} from '@fifer/external-bridge-engine';

import { EngineRegistry } from '@/registry/engine-registry';

export {
  ENGINE_ID,
  ExternalBridgeEngine,
} from '@fifer/external-bridge-engine';
export type {
  ExternalBridgeEngineApi,
  IntegrationPublicStatus,
  UnifiedIntegrationPublicStatus,
} from '@fifer/external-bridge-engine';

try {
  EngineRegistry.register(ENGINE_ID, new ExternalBridgeEngine());
} catch (error) {
  console.error(`[FIFER Engine] ${ENGINE_ID} — error en registro:`, error);
}

try {
  void ENGINE_ID;
} catch (error) {
  console.error(`[FIFER Engine] ${ENGINE_ID} — error en fase de carga:`, error);
}
