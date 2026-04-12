/**
 * Sub-Engine `forecast-core:cashflow-liquidity` — pronóstico determinista de liquidez a 30 días.
 */

import { Decimal } from '@prisma/client/runtime/library';

import { EngineRegistry } from '@/registry/engine-registry';

import {
  type CashflowLiquidityInput,
  type CashflowLiquidityOutput,
  cashflowLiquidityInputSchema,
} from './schemas';

const SUB_ENGINE_ID = 'forecast-core:cashflow-liquidity' as const;
const LOG_PREFIX = `[FIFER SubEngine ${SUB_ENGINE_ID}]`;
const HORIZON_DAYS = 30;
const MIN_TX = 3;
const MIN_GAP_DAYS = 14;

function utcDayNumber(d: Date): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000,
  );
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * v1: media diaria del flujo neto observado sobre la ventana calendario [primera, última] transacción,
 * proyectada linealmente a 30 días. Sin persistencia; solo COMPLETADO cuenta como válido.
 */
export function computeLiquidityForecast(raw: CashflowLiquidityInput): CashflowLiquidityOutput {
  const parsed = cashflowLiquidityInputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`[${SUB_ENGINE_ID}] Entrada inválida: ${parsed.error.message}`);
  }
  const { account, transactions } = parsed.data;

  const valid = transactions.filter((t) => t.status === 'COMPLETADO');
  const n = valid.length;

  if (n === 0) {
    return {
      status: 'insufficient_data',
      reason:
        'No hay transacciones completadas para calcular un patrón. Registre movimientos o espere a que queden en estado COMPLETADO.',
      rules: { minTransactions: MIN_TX, minTemporalSpreadDays: MIN_GAP_DAYS },
      observed: { transactionCount: 0, gapDaysFirstToLast: 0 },
    };
  }

  const dates = valid.map((t) => toDate(t.createdAt));
  const minD = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxD = new Date(Math.max(...dates.map((d) => d.getTime())));
  const gapDays = Math.max(0, utcDayNumber(maxD) - utcDayNumber(minD));
  const countOk = n >= MIN_TX;
  const temporalOk = gapDays >= MIN_GAP_DAYS;

  if (!countOk && !temporalOk) {
    return {
      status: 'insufficient_data',
      reason:
        'Datos insuficientes para una proyección estable: se requieren al menos 3 transacciones completadas, o bien 14 días de dispersión entre la primera y la última.',
      rules: { minTransactions: MIN_TX, minTemporalSpreadDays: MIN_GAP_DAYS },
      observed: { transactionCount: n, gapDaysFirstToLast: gapDays },
    };
  }

  let totalSigned = new Decimal(0);
  for (const t of valid) {
    const amt = new Decimal(t.amount);
    const signed = t.type === 'INGRESO' ? amt : amt.negated();
    totalSigned = totalSigned.plus(signed);
  }

  const windowDays = Math.max(1, gapDays + 1);
  const meanDailyNet = totalSigned.div(windowDays);
  const projectedNet30 = meanDailyNet.mul(HORIZON_DAYS);

  const balance = new Decimal(account.balance);
  const projectedEnd = balance.plus(projectedNet30);

  const negativeProjectedNetFlow = projectedNet30.isNegative();
  const projectedEndBalanceBelowZero = projectedEnd.isNegative();

  return {
    status: 'ready',
    schemaVersion: '1.0-cashflow-liquidity',
    horizonDays: HORIZON_DAYS,
    currency: account.currency,
    currentBalance: balance.toFixed(2),
    totalSignedNetObserved: totalSigned.toFixed(2),
    observationWindowDays: windowDays,
    meanDailyNet: meanDailyNet.toFixed(2),
    projectedNetCashflow30d: projectedNet30.toFixed(2),
    projectedEndBalance: projectedEnd.toFixed(2),
    negativeProjectedNetFlow,
    projectedEndBalanceBelowZero,
  };
}

export type CashflowLiquiditySubEngineApi = {
  readonly id: typeof SUB_ENGINE_ID;
  runLiquidityForecast: (input: CashflowLiquidityInput) => CashflowLiquidityOutput;
  getHealthStatus: () => { ok: boolean; id: string };
};

class CashflowLiquiditySubEngine implements CashflowLiquiditySubEngineApi {
  readonly id = SUB_ENGINE_ID;

  runLiquidityForecast(input: CashflowLiquidityInput): CashflowLiquidityOutput {
    try {
      return computeLiquidityForecast(input);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`${LOG_PREFIX} error en runLiquidityForecast:`, error);
      throw new Error(`${LOG_PREFIX} ${msg}`);
    }
  }

  getHealthStatus(): { ok: boolean; id: string } {
    return { ok: true, id: SUB_ENGINE_ID };
  }
}

try {
  EngineRegistry.register(SUB_ENGINE_ID, new CashflowLiquiditySubEngine());
} catch (error) {
  console.error(`${LOG_PREFIX} error en registro o fase de carga:`, error);
}

try {
  void SUB_ENGINE_ID;
} catch (error) {
  console.error(`${LOG_PREFIX} error en fase de carga:`, error);
}
