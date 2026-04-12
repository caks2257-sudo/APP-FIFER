'use client';

import { useLiquidityForecast } from '@/app/[locale]/(dashboard)/finanzas/useLiquidityForecast';
import LiquidityForecastBox from '@/app/[locale]/(dashboard)/finanzas/LiquidityForecastBox';

import type { BoxProps } from '../registry';

/**
 * Shell de catálogo (`boxId: finance-liquidity-forecast`) para layouts / ingestion v0.
 * Hidrata el mismo UI que el Hub de Finanzas vía `useLiquidityForecast`.
 */
export default function FinanceLiquidityForecastBox(_props: BoxProps) {
  void _props;
  const liquidity = useLiquidityForecast();
  return (
    <LiquidityForecastBox
      data={liquidity.data}
      loading={liquidity.loading}
      error={liquidity.error}
    />
  );
}
