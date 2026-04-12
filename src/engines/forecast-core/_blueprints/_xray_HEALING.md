# Plano HEALING — `forecast-core`

## UBICACIÓN LÓGICA

`FIFER://ENGINE/forecast-core`

## Reflejo de código

| Capa | Comportamiento |
|------|----------------|
| Sub-motor | `runLiquidityForecast` envuelve `computeLiquidityForecast` en `try/catch`; errores inesperados se registran y relanzan con prefijo `[FIFER SubEngine forecast-core:cashflow-liquidity]` |
| API | `src/app/api/v1/finanzas/liquidity-forecast/route.ts` — `try/catch` global → 500 JSON `{ error }` sin tumbar el proceso |
| Datos insuficientes | **No** es error HTTP: respuesta 200 con `status: insufficient_data` |
| AI Fallback | N/A en v1 (pronóstico numérico determinista) |
