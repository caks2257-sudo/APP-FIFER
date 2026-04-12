# Lógica — finance-engine (padre)

## UBICACIÓN LÓGICA

`FIFER://engines/finance-engine`

**targetAppOrEngine:** `finance-engine`

## Sub-motores

| ID | Ruta |
|----|------|
| `finance-engine:reconciliation` | `src/engines/finance-engine/sub-engines/reconciliation/index.ts` |
| `finance-engine:billing` | `src/engines/finance-engine/sub-engines/billing/index.ts` |
| `finance-engine:payments` | `src/engines/finance-engine/sub-engines/payments/index.ts` |

## Registro

`EngineRegistry.register('finance-engine', new FinanceEngine())` en `src/engines/finance-engine/index.ts`.
