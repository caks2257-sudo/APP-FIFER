# Plano LOGIC — `forecast-core:cashflow-liquidity`

## UBICACIÓN LÓGICA

`FIFER://SUB_ENGINE/forecast-core/cashflow-liquidity`

## Reflejo de código

| Detalle | Implementación |
|---------|----------------|
| Transacciones válidas | Solo `status === 'COMPLETADO'` |
| Suma firmada | `INGRESO` suma monto; `EGRESO` resta (`Decimal` Prisma) |
| Ventana | `gapDays = utcDayNumber(max) - utcDayNumber(min)`; `windowDays = max(1, gapDays + 1)` |
| Horizonte | 30 días fijo (`HORIZON_DAYS`) |
| Métricas | Ver campos en `cashflowLiquidityReadySchema` (`schemas.ts`) |
