/**
 * Motor `forecast-core` — contenedor de pronósticos analíticos (sub-motores por dominio).
 */

import './sub-engines/cashflow-liquidity';

import { EngineRegistry } from '@/registry/engine-registry';

const ENGINE_ID = 'forecast-core' as const;
const LOG_PREFIX = `[FIFER Engine ${ENGINE_ID}]`;

export type ForecastCoreHealth = {
  ok: boolean;
  engineId: typeof ENGINE_ID;
  subEngines: readonly ['forecast-core:cashflow-liquidity'];
};

export class ForecastCoreEngine {
  readonly id = ENGINE_ID;

  getHealthStatus(): ForecastCoreHealth {
    return {
      ok: true,
      engineId: ENGINE_ID,
      subEngines: ['forecast-core:cashflow-liquidity'],
    };
  }
}

try {
  EngineRegistry.register(ENGINE_ID, new ForecastCoreEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro o fase de carga:`, error);
}

try {
  void ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}
