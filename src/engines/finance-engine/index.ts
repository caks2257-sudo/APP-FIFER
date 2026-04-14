/**
 * Motor `finance-engine` — contenedor de lógica financiera (reconciliación bancaria, etc.).
 * v10.0: Stateless Adapter (Delegación pura a Agentes Externos)
 */

import './sub-engines/billing';
import './sub-engines/payments';
import './sub-engines/reconciliation';

import { EngineRegistry } from '@/registry/engine-registry';
// Importamos el puente (Ajusta la ruta a tu arquitectura real)
import { callExternalAgent } from '@/engines/external-bridge-engine'; 

// Importamos los contratos Zod que acabas de crear
import { 
  ConciliacionSchema, type ConciliacionInput,
  PagoSchema, type PagoInput 
} from './schemas';

export * from './schemas';

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

  // ==============================================================
  // ⚡ MÉTODOS DE DELEGACIÓN (STATELESS ADAPTER)
  // ==============================================================

  /**
   * Valida el input y delega la conciliación al Agente Tasklet/Fintoc
   */
  async procesarConciliacion(data: ConciliacionInput) {
    // 1. Inmunidad: Validación estricta (Si falla, lanza error y la UI lo atrapa)
    const validData = ConciliacionSchema.parse(data);
    
    // 2. Delegación pura (cero lógica algorítmica local)
    console.log(`${LOG_PREFIX} Delegando conciliación a Tasklet/Fintoc...`);
    return await callExternalAgent({
      agentId: 'fintoc',
      action: 'conciliar-movimientos',
      payload: validData,
    });
  }

  /**
   * Valida el input y delega el pago al Agente
   */
  async procesarPago(data: PagoInput) {
    const validData = PagoSchema.parse(data);
    console.log(`${LOG_PREFIX} Delegando pago...`);
    return await callExternalAgent({
      agentId: 'fintoc',
      action: 'ejecutar-pago',
      payload: validData,
    });
  }
}

// Registro del motor
try {
  EngineRegistry.register(ENGINE_ID, new FinanceEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro:`, error);
}