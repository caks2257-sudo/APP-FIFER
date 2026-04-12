# Contrato — finance-engine:payments

## UBICACIÓN LÓGICA

`FIFER://engines/finance-engine/payments`

**targetAppOrEngine:** `finance-engine:payments`

## API pública (sub-engine)

| Función | Entrada | Salida |
|---------|---------|--------|
| `createPaymentCheckout` | `{ prisma, accountId, amountClp, description, publicOrigin, vault }` | `{ transactionId, mode, url, checkoutId }` |

Dependencia: `EngineRegistry.use('external-bridge-engine').createCheckoutLink(...)`.
