# Plano de Datos — Finanzas

## Validación Zod

- **`transaccionSchema`** en `src/types/schemas.ts`: `amount` (coerce número, estrictamente positivo), `type` enum `INGRESO` | `EGRESO`, `concept` string recortado 1–500 caracteres. Tipo exportado: `TransaccionInput`.

## Prisma

- **`FinancialAccount`** y **`Transaction`:** definidos en `prisma/schema.prisma`; alta vía API con `status` `COMPLETADO` en el POST.

## API HTTP

| Método | Ruta | Comportamiento |
|--------|------|----------------|
| `GET` | `/api/v1/finanzas` | Sesión Supabase → `User` por email → `financialAccount` con upsert inicial; devuelve cuenta y últimas 10 `Transaction` por `createdAt` descendente. |
| `POST` | `/api/v1/finanzas` | Valida `transaccionSchema`; asegura cuenta; `prisma.$transaction` atómica: crea `Transaction` y actualiza `balance` (suma si `INGRESO`, resta si `EGRESO`). Respuesta: `transaction` serializada, `balance` y `currency` string. |
| `GET` | `/api/v1/finanzas/liquidity-forecast` | Hot compute: cuenta + todas las `Transaction` con `status` `COMPLETADO` → `EngineRegistry.use('forecast-core:cashflow-liquidity')` → `runLiquidityForecast`. JSON `status: ready` \| `insufficient_data` (sin error HTTP en cold start). Contratos Zod: `src/engines/forecast-core/sub-engines/cashflow-liquidity/schemas.ts`. |
| `GET` | `/api/v1/finanzas/sync-bank` | Preview: `EngineRegistry.use('finance-engine:reconciliation').previewBankReconciliation(prisma, accountId, vault)` — movimientos bancarios no aún importados (`bridgeMode` MOCK/PROD). |
| `POST` | `/api/v1/finanzas/sync-bank` | Aplica: `applyBankReconciliation` — crea `Transaction` con `source: bank_sync`, `status: COMPLETADO`, `bankExternalId` / `bankPostedAt`; actualiza saldo. |
| `POST` | `/api/v1/finanzas/checkout` | Sesión; `EngineRegistry.use('finance-engine:payments').createPaymentCheckout` — crea `Transaction` `PENDIENTE`, `source: payment_checkout`, `INGRESO`; devuelve `checkoutUrl` y `bridgeMode`. |
| `POST` | `/api/v1/webhooks/payments/mock` | Público; firma HMAC; pasa `PENDIENTE` → `COMPLETADO` y acredita saldo. |
| `POST` | `/api/v1/webhooks/payments/flow` | Público; Bearer secreto; stub PROD. |
| `POST` | `/api/v1/finanzas/billing/emit` | Sesión; `finance-engine:billing` — emisión manual DTE (requiere `transactionId` válido). |
| `GET` | `/api/v1/finanzas/billing/mock-pdf?tx=` | Sesión; PDF simulado si `dteStatus === 'emitido'`. |

Implementación: `src/app/api/v1/finanzas/route.ts`; pronóstico: `src/app/api/v1/finanzas/liquidity-forecast/route.ts`; banco: `src/app/api/v1/finanzas/sync-bank/route.ts`; checkout: `src/app/api/v1/finanzas/checkout/route.ts`; webhooks: `src/app/api/v1/webhooks/payments/[provider]/route.ts`; facturación: `src/app/api/v1/finanzas/billing/`.

## Prisma (movimientos bancarios)

- `Transaction.source` (`manual` \| `bank_sync`), `bankExternalId`, `bankPostedAt` — deduplicación con Bridge; ver `prisma/schema.prisma`.

## Prisma (DTE / facturación)

- `Transaction.dteFolio`, `dtePdfUrl`, `dteStatus` — emisión vía Bridge billing y sub-engine `finance-engine:billing`.

## Cliente React

- **`useFinanzas.ts`:** `fetch` GET al montar (`credentials: 'include'`, `no-store`); estado `account`, `transactions`, `loading`, `error`; `refetch`; `crearTransaccion` vía POST con el mismo payload Zod.
- **`formatMoney.ts`:** `formatMoneyAmount(amountStr, currency)` — CLP con `Intl` `es-CL`; `UF` como número localizado + sufijo `UF`.

## Página

- **`page.tsx`** compone `BalanceCard`, `TransactionList`, `NewTransactionModal` y `SmartInsightWidget`; el modal llama a `crearTransaccion` y en éxito ejecuta `refetch`.
