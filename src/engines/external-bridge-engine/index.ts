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

/**
 * Orquestador de llamadas a agentes externos (§14)
 * Bridge para Tasklet, Fintoc, Make, etc.
 */
export async function callExternalAgent<T = any>(params: {
  agentId: string;
  action: string;
  payload: any;
}): Promise<T> {
  console.log(`[ExternalBridge] Llamando a agente: ${params.agentId} -> ${params.action}`);

  const engine = EngineRegistry.use<ExternalBridgeEngine>(ENGINE_ID);
  // Validamos que el método call exista en el motor antes de invocarlo
  if (engine && typeof (engine as any).call === 'function') {
    return (engine as any).call(params);
  }

  // Fallback de seguridad en fase de desarrollo
  return {} as T;
}

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
