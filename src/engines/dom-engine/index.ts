/**
 * Motor `dom-engine` — expedientes municipales DOM (Recepciones, Permisos, Regularizaciones) y sub-motores normativos.
 */

import '@/engines/external-bridge-engine';
import './sub-engines/form-generator';
import './sub-engines/normative-analyzer';

import { EngineRegistry } from '@/registry/engine-registry';

const ENGINE_ID = 'dom-engine' as const;
const LOG_PREFIX = `[FIFER Engine ${ENGINE_ID}]`;

export type DomEngineHealth = {
  ok: boolean;
  engineId: typeof ENGINE_ID;
  subEngines: readonly ['dom-engine:form-generator', 'dom-engine:normative-analyzer'];
};

export class DomEngine {
  readonly id = ENGINE_ID;

  getHealthStatus(): DomEngineHealth {
    return {
      ok: true,
      engineId: ENGINE_ID,
      subEngines: ['dom-engine:form-generator', 'dom-engine:normative-analyzer'],
    };
  }
}

try {
  EngineRegistry.register(ENGINE_ID, new DomEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro:`, error);
}

try {
  void ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}
