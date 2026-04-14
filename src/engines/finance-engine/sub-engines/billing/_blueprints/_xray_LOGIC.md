# Lógica — finance-engine:billing

## UBICACIÓN LÓGICA

`FIFER://engines/finance-engine/billing`

**targetAppOrEngine:** `finance-engine:billing`

## IVA

- Tasa por defecto **19%** (`DEFAULT_IVA_RATE` en `openfactura-mapper.ts`).
- Total transacción = base neta × (1 + IVA) aproximado en CLP.

## Trigger automático

- `POST /api/v1/webhooks/payments/*` tras `COMPLETADO` en `payment_checkout` → `queueMicrotask` → `triggerAutoInvoiceAfterPaymentCheckout(transactionId, publicOrigin)`.
## CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)

- transactionid
- prisma
- expediente
- publicorigin
- customer
- result
- reason
- folio
- total
- email
- emitinvoicefortransaction
- fifer
- transaction
- account

