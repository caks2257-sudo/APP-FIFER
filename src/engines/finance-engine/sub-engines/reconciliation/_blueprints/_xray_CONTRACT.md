# Contrato — finance-engine:reconciliation

## UBICACIÓN LÓGICA

`FIFER://engines/finance-engine/reconciliation`

**targetAppOrEngine:** `finance-engine:reconciliation`

## Entradas / salidas

| Función | Entrada | Salida |
|---------|---------|--------|
| `previewBankReconciliation` | `prisma`, `accountId`, `vault?` | `BankReconciliationPreviewResult` |
| `applyBankReconciliation` | `prisma`, `accountId`, `vault?` | `BankReconciliationApplyResult` |

Dependencia: `EngineRegistry.use('external-bridge-engine').getBankingTransactions(vault)`.
