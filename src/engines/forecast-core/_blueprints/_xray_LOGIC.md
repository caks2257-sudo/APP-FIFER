# Plano LOGIC — `forecast-core`

## UBICACIÓN LÓGICA

`FIFER://ENGINE/forecast-core`

## Reflejo de código

| Comportamiento | Ubicación |
|----------------|-----------|
| Carga del sub-motor | `src/engines/forecast-core/index.ts` — `import './sub-engines/cashflow-liquidity'` |
| Algoritmo v1 (determinista) | `computeLiquidityForecast` en `sub-engines/cashflow-liquidity/index.ts` |
| Cold start | Mínimo **3** transacciones `COMPLETADO` **o** dispersión **≥ 14** días (diferencia de día civil UTC entre primera y última); si no, `status: insufficient_data` |
| Proyección | `meanDailyNet = totalSignedNet / max(1, gapDays+1)`; `projectedNet30 = meanDailyNet * 30`; `projectedEndBalance = balance + projectedNet30` |
| Riesgos reportados | `negativeProjectedNetFlow`, `projectedEndBalanceBelowZero` |
