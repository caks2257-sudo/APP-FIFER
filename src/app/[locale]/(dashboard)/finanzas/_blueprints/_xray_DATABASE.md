# Espejo técnico — Persistencia (App `finanzas`)

## UBICACIÓN LÓGICA

`FIFER://APP/FINANZAS`

**Alcance:** App Finanzas persiste movimientos y saldo vía modelos Prisma **`FinancialAccount`** (1:1 con `User`) y **`Transaction`** (N:1 con `FinancialAccount`).  
**Clase de documento:** Espejo técnico 1:1 con `prisma/schema.prisma`. Si hay divergencia, prevalece `schema.prisma`.  
**Espejo global ampliado:** `prisma/_xray_DATABASE_GLOBAL.md`.

## Modelo `FinancialAccount`

| Campo      | Prisma   | Notas |
|------------|----------|--------|
| `id`       | `String` @id cuid | PK |
| `userId`   | `String` @unique | FK → `User.id`, `ON DELETE CASCADE` |
| `balance`  | `Decimal(18,2)` | Default `0` |
| `currency` | `String` | Default `"CLP"` |
| `createdAt` / `updatedAt` | `DateTime` | `@updatedAt` en `updatedAt` |

## Modelo `Transaction`

| Campo       | Prisma | Notas |
|-------------|--------|--------|
| `id`        | `String` @id cuid | PK |
| `accountId` | `String` | FK → `FinancialAccount.id`, `ON DELETE CASCADE` |
| `amount`    | `Decimal(18,2)` | Monto firmado según negocio |
| `currency`  | `String` | Default `"CLP"` |
| `type`      | `TransactionType` | `INGRESO` \| `EGRESO` |
| `concept`   | `String` | Texto libre (ej. honorarios, derechos municipales) |
| `status`    | `TransactionStatus` | `PENDIENTE` \| `COMPLETADO` \| `FALLIDO` |
| `createdAt` / `updatedAt` | `DateTime` | |

**Índice:** `@@index([accountId])`.

## API HTTP

- Lectura agregada: `GET /api/v1/finanzas` — devuelve la cuenta del usuario autenticado (creada en caliente con saldo 0 si no existía) y las últimas 10 transacciones por `createdAt` descendente. Implementación: `src/app/api/v1/finanzas/route.ts`.
