# Plano CONTRACT — `forecast-core`

## UBICACIÓN LÓGICA

`FIFER://ENGINE/forecast-core`

## Reflejo de código

| Rol | Artefacto |
|-----|-----------|
| Motor padre | `src/engines/forecast-core/index.ts` — clase `ForecastCoreEngine`, `getHealthStatus()` |
| Sub-motor liquidez | `src/engines/forecast-core/sub-engines/cashflow-liquidity/index.ts` — `CashflowLiquiditySubEngine`, id `forecast-core:cashflow-liquidity` |
| Entrada Zod | `cashflowLiquidityInputSchema` en `.../cashflow-liquidity/schemas.ts` |
| Salida Zod | `cashflowLiquidityOutputSchema` — discriminada `insufficient_data` \| `ready` |

**Registro:** `EngineRegistry.register('forecast-core', ...)` y `EngineRegistry.register('forecast-core:cashflow-liquidity', ...)`.

**Consumidor HTTP:** `GET /api/v1/finanzas/liquidity-forecast` invoca en proceso `runLiquidityForecast` del sub-motor (sin `InternalApiKey` en v1 — ver `docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md`).
