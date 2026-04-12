# Contrato — finance-engine:billing

## UBICACIÓN LÓGICA

`FIFER://engines/finance-engine/billing`

**targetAppOrEngine:** `finance-engine:billing`

## Reglas (Auto-Healing)

- Ninguna emisión sin `transactionId` Prisma válido (no vacío). El `BillingAdapter` rechaza `emitInvoice` sin id.
- `mapTransactionToEmitInvoiceInput` exige monto > 0.

## Entradas

| Función | Descripción |
|---------|-------------|
| `emitInvoiceForTransaction` | Emisión idempotente; opción `onlyPaymentCheckout` para trigger webhook |
| `triggerAutoInvoiceAfterPaymentCheckout` | Post-checkout; requiere `publicOrigin` |
