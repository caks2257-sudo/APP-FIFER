# Lógica — finance-engine:reconciliation

## UBICACIÓN LÓGICA

`FIFER://engines/finance-engine/reconciliation`

**targetAppOrEngine:** `finance-engine:reconciliation`

## Dedup

1. `bankExternalId` ya presente en `Transaction` para la misma cuenta.
2. Huella `YYYY-MM-DD|monto|glosa` sobre `bankPostedAt` + monto + concepto (respaldo).

## Persistencia

Al aplicar: `source: bank_sync`, `status: COMPLETADO`, actualización atómica de `FinancialAccount.balance`.
## CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)

- balance
- concept
- accountid
- currency
- prisma
- amountclp
- externalid
- postedat
- savedids
- bridgemode
- newmovements
- vault
- bank
- externalbridgeengineapi

