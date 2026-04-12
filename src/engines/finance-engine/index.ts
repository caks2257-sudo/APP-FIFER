/**
 * Motor `finance-engine` — contenedor de lógica financiera (reconciliación bancaria, etc.).
 */

import './sub-engines/billing';
import './sub-engines/payments';
import './sub-engines/reconciliation';

import { EngineRegistry } from '@/registry/engine-registry';

const ENGINE_ID = 'finance-engine' as const;
const LOG_PREFIX = `[FIFER Engine ${ENGINE_ID}]`;

export type FinanceEngineHealth = {
  ok: boolean;
  engineId: typeof ENGINE_ID;
  subEngines: readonly [
    'finance-engine:billing',
    'finance-engine:reconciliation',
    'finance-engine:payments',
  ];
};

export class FinanceEngine {
  readonly id = ENGINE_ID;

  getHealthStatus(): FinanceEngineHealth {
    return {
      ok: true,
      engineId: ENGINE_ID,
      subEngines: [
        'finance-engine:billing',
        'finance-engine:reconciliation',
        'finance-engine:payments',
      ],
    };
  }
}

try {
  EngineRegistry.register(ENGINE_ID, new FinanceEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro:`, error);
}

try {
  void ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}
