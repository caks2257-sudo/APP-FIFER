/**
 * Motor `system-engine` — utilidades de plataforma (Sub-Engines: gestión de entorno local, etc.).
 */

import './sub-engines/env-manager';

import { EngineRegistry } from '@/registry/engine-registry';

const ENGINE_ID = 'system-engine' as const;
const LOG_PREFIX = `[FIFER Engine ${ENGINE_ID}]`;

export type SystemEngineHealth = {
  ok: boolean;
  engineId: typeof ENGINE_ID;
  subEngines: readonly ['system-engine:env-manager'];
};

export class SystemEngine {
  readonly id = ENGINE_ID;

  getHealthStatus(): SystemEngineHealth {
    return {
      ok: true,
      engineId: ENGINE_ID,
      subEngines: ['system-engine:env-manager'],
    };
  }
}

try {
  EngineRegistry.register(ENGINE_ID, new SystemEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro:`, error);
}

try {
  void ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}
