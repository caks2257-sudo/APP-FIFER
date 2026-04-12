'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  cashflowLiquidityOutputSchema,
  type CashflowLiquidityOutput,
} from '@/engines/forecast-core/sub-engines/cashflow-liquidity/schemas';
import { boxCircuitBreaker } from '@/utils/box-circuit-breaker';

const API_PATH = '/api/v1/finanzas/liquidity-forecast';

/** Mismo id que `box-catalog` / rompecircuitos (`registerBoxCircuit`). */
export const LIQUIDITY_FORECAST_BOX_CIRCUIT_ID = 'finance-liquidity-forecast' as const;

export type UseLiquidityForecastResult = {
  data: CashflowLiquidityOutput | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

/**
 * Consume el pronóstico de liquidez a 30 días (sub-motor `forecast-core:cashflow-liquidity`).
 * Valida la respuesta con el mismo Zod que el motor (`cashflowLiquidityOutputSchema`).
 */
export function useLiquidityForecast(options?: { enabled?: boolean }): UseLiquidityForecastResult {
  const [data, setData] = useState<CashflowLiquidityOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(API_PATH, { credentials: 'include', cache: 'no-store' });
      if (res.status === 401) {
        setError('No autenticado');
        setData(null);
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        const msg =
          typeof j.error === 'string'
            ? j.error
            : typeof j.detail === 'string'
              ? j.detail
              : 'No se pudo cargar el pronóstico de liquidez';
        setError(msg);
        setData(null);
        boxCircuitBreaker.recordFailure(LIQUIDITY_FORECAST_BOX_CIRCUIT_ID);
        return;
      }
      const json: unknown = await res.json();
      const parsed = cashflowLiquidityOutputSchema.safeParse(json);
      if (!parsed.success) {
        setError('Respuesta del servidor no coincide con el contrato de pronóstico');
        setData(null);
        boxCircuitBreaker.recordFailure(LIQUIDITY_FORECAST_BOX_CIRCUIT_ID);
        return;
      }
      setData(parsed.data);
    } catch {
      setError('Error de red');
      setData(null);
      boxCircuitBreaker.recordFailure(LIQUIDITY_FORECAST_BOX_CIRCUIT_ID);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.enabled === false) {
      setLoading(false);
      return;
    }
    void refetch();
  }, [refetch, options?.enabled]);

  return { data, loading, error, refetch };
}
