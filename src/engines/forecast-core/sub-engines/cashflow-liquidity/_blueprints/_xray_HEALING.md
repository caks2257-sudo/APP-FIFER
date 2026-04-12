# Plano HEALING — `forecast-core:cashflow-liquidity`

## UBICACIÓN LÓGICA

`FIFER://SUB_ENGINE/forecast-core/cashflow-liquidity`

## Reflejo de código

| Pieza | Archivo |
|-------|---------|
| try/catch en método público | `src/engines/forecast-core/sub-engines/cashflow-liquidity/index.ts` — `runLiquidityForecast` |
| Entrada inválida (Zod) | `computeLiquidityForecast` lanza si `safeParse` falla (uso interno tras validación en API) |

Cold start insuficiente no lanza: devuelve `insufficient_data`.
