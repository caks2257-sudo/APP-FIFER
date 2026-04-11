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

Implementación: `src/app/api/v1/finanzas/route.ts`.

## Cliente React

- **`useFinanzas.ts`:** `fetch` GET al montar (`credentials: 'include'`, `no-store`); estado `account`, `transactions`, `loading`, `error`; `refetch`; `crearTransaccion` vía POST con el mismo payload Zod.
- **`formatMoney.ts`:** `formatMoneyAmount(amountStr, currency)` — CLP con `Intl` `es-CL`; `UF` como número localizado + sufijo `UF`.

## Página

- **`page.tsx`** compone `BalanceCard`, `TransactionList`, `NewTransactionModal` y `SmartInsightWidget`; el modal llama a `crearTransaccion` y en éxito ejecuta `refetch`.
