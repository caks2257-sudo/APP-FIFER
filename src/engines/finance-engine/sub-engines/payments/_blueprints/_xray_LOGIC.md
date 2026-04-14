# Lógica — finance-engine:payments

## UBICACIÓN LÓGICA

`FIFER://engines/finance-engine/payments`

**targetAppOrEngine:** `finance-engine:payments`

## Flujo

1. Crea `Transaction` con `status: PENDIENTE`, `type: INGRESO`, `source: payment_checkout`.
2. Delega URL en External Bridge (`PaymentsAdapter.createCheckoutLink`).
3. Webhook `POST /api/v1/webhooks/payments/[provider]` finaliza el cobro (`COMPLETADO` + saldo).
## CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)

- prisma
- accountid
- amountclp
- bridge
- createpaymentcheckout
- description
- sub_engine_id
- account
- engineregistry
- external-bridge-engine
- externalbridgeengineapi
- link
- publicorigin
- transactionid

