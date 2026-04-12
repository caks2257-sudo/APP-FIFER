# Espejo técnico — base de datos FIFER (global)

**Clase de documento:** Espejo técnico 1:1 con `prisma/schema.prisma`.  
**Regla de conflicto:** Si este archivo y `schema.prisma` divergen, prevalece `schema.prisma`.  
**Esquema PostgreSQL:** `public` (convención Prisma sin `@@map`).

## Jerarquía Hub & Spoke (Apps principales y Sub-Apps)

| Rol | Significado en datos | Columnas típicas | GPS (`LOCATION_MAP.json`) |
|-----|----------------------|-------------------|---------------------------|
| **Hub** | App de producto de primer nivel que origina entidades multi-tenant | `mainApp` = slug del Hub (ej. `finanzas`, `dom`, `misbots`) | Tipo `APP` — carpeta `src/app/(dashboard)/<slug>/` |
| **Spoke** | Módulo anidado bajo el mismo dominio de rutas | `subApp` opcional alinea el spoke (ej. `recepcion`, `normativa`) | Tipo `SUB_APP` — segmentos bajo el mismo `<slug>/` |

- Toda fila de negocio con `mainApp` / `subApp` debe documentarse en el `_xray_DATABASE.md` local del Hub o Spoke que la escribe.
- El espejo de UI de esta jerarquía (layout, grid, tokens) está en `docs/blueprints/_xray_UI_GLOBAL.md`.

## Mapeo Prisma → SQL (columnas escalares)

| Prisma     | PostgreSQL (típico) |
|-----------|----------------------|
| `String`  | `TEXT`               |
| `Int`     | `INTEGER`            |
| `DateTime`| `TIMESTAMP(3)`       |
| `Json`    | `JSONB`              |
| `String?` | `TEXT NULL`          |
| `Json?`   | `JSONB NULL`         |
| `Decimal` | `NUMERIC` (precisión vía `@db.Decimal`) |

---

## Tabla `"User"` (modelo Prisma: `User`)

| Columna   | Tipo SQL        | NOT NULL | Default / notas Prisma        | Clave |
|-----------|-----------------|----------|-------------------------------|--------|
| `id`      | TEXT            | sí       | `cuid()`                      | PK     |
| `email`   | TEXT            | sí       | —                             | UNIQUE |
| `name`    | TEXT            | sí       | —                             |        |
| `role`    | TEXT            | sí       | `'user'`                      |        |
| `tier`    | TEXT            | sí       | `'free'`                      |        |
| `createdAt` | TIMESTAMP(3)  | sí       | `now()`                       |        |
| `updatedAt` | TIMESTAMP(3)  | sí       | `@updatedAt`                  |        |

**Relaciones salientes (Prisma):** `expediente Expediente?`, `financialAccount FinancialAccount?`, `bots Bot[]`, `contracts Contract[]`, `documents Document[]`, `internalApiKeys InternalApiKey[]`.

---

## Tabla `"Expediente"` (modelo Prisma: `Expediente`)

| Columna           | Tipo SQL        | NOT NULL | Default / notas Prisma | Clave |
|-------------------|-----------------|----------|-------------------------|--------|
| `id`              | TEXT            | sí       | `cuid()`                | PK     |
| `userId`          | TEXT            | sí       | FK → `"User"."id"`      | UNIQUE, FK |
| `rut`             | TEXT            | sí       | —                       | UNIQUE |
| `nombres`         | TEXT            | sí       | —                       |        |
| `apellidoPaterno` | TEXT            | sí       | —                       |        |
| `apellidoMaterno` | TEXT            | sí       | —                       |        |
| `nacionalidad`    | TEXT            | sí       | —                       |        |
| `fechaNacimiento` | TIMESTAMP(3)   | sí       | —                       |        |
| `createdAt`       | TIMESTAMP(3)   | sí       | `now()`                 |        |
| `updatedAt`       | TIMESTAMP(3)   | sí       | `@updatedAt`            |        |

**FK:** `userId` → `"User"."id"`, `ON DELETE CASCADE`.

**Índices Prisma:** único en `userId`, único en `rut`.

**API:** lectura y mutación en `src/app/api/v1/perfil/route.ts` (sesión Supabase + fila `User` resuelta por `email`).

---

## Tabla `"Bot"` (modelo Prisma: `Bot`)

| Columna     | Tipo SQL        | NOT NULL | Default / notas Prisma           | Clave |
|-------------|-----------------|----------|----------------------------------|--------|
| `id`        | TEXT            | sí       | `cuid()`                         | PK     |
| `name`      | TEXT            | sí       | —                                |        |
| `status`    | TEXT            | sí       | —                                |        |
| `modelId`   | TEXT            | sí       | —                                |        |
| `avatarUrl` | TEXT            | no       | —                                |        |
| `mainApp`   | TEXT            | sí       | `'misbots'`                      |        |
| `sourceApp` | TEXT            | no       | legado; columna física conservada en BD |        |
| `subApp`    | TEXT            | no       | —                                |        |
| `metadata`  | JSONB           | no       | —                                |        |
| `ownerId`   | TEXT            | sí       | FK → `"User"."id"`               | FK     |
| `createdAt` | TIMESTAMP(3)   | sí       | `now()`                          |        |
| `updatedAt` | TIMESTAMP(3)   | sí       | `@updatedAt`                     |        |

**FK:** `ownerId` → `"User"."id"`, `ON DELETE CASCADE` (Prisma: `onDelete: Cascade`).

**Índices Prisma:** `@@index([ownerId])`, `@@index([mainApp])`.

---

## Tabla `"FinancialAccount"` (modelo Prisma: `FinancialAccount`)

| Columna   | Tipo SQL        | NOT NULL | Default / notas Prisma | Clave |
|-----------|-----------------|----------|-------------------------|--------|
| `id`      | TEXT            | sí       | `cuid()`                | PK     |
| `userId`  | TEXT            | sí       | FK → `"User"."id"`      | UNIQUE, FK |
| `balance` | NUMERIC(18,2)   | sí       | `0`                     |        |
| `currency`| TEXT            | sí       | `'CLP'`                 |        |
| `createdAt` | TIMESTAMP(3) | sí       | `now()`                 |        |
| `updatedAt` | TIMESTAMP(3) | sí       | `@updatedAt`            |        |

**FK:** `userId` → `"User"."id"`, `ON DELETE CASCADE`.

**API:** `GET /api/v1/finanzas` crea la fila con saldo 0 si no existe y devuelve las últimas 10 transacciones.

---

## Tabla `"Transaction"` (modelo Prisma: `Transaction`)

| Columna   | Tipo SQL        | NOT NULL | Default / notas Prisma | Clave |
|-----------|-----------------|----------|-------------------------|--------|
| `id`      | TEXT            | sí       | `cuid()`                | PK     |
| `accountId` | TEXT          | sí       | FK → `"FinancialAccount"."id"` | FK |
| `amount`  | NUMERIC(18,2)   | sí       | —                       |        |
| `currency`| TEXT            | sí       | `'CLP'`                 |        |
| `type`    | enum Postgres   | sí       | `TransactionType`     |        |
| `concept` | TEXT            | sí       | —                       |        |
| `status`  | enum Postgres   | sí       | `TransactionStatus`   |        |
| `createdAt` | TIMESTAMP(3) | sí       | `now()`                 |        |
| `updatedAt` | TIMESTAMP(3) | sí       | `@updatedAt`            |        |

**FK:** `accountId` → `"FinancialAccount"."id"`, `ON DELETE CASCADE`.

**Índices Prisma:** `@@index([accountId])`.

---

## Enum `TransactionType` (Prisma)

| Variante | Significado |
|----------|-------------|
| `INGRESO` | Entrada de fondos |
| `EGRESO` | Salida de fondos |

## Enum `TransactionStatus` (Prisma)

| Variante | Significado |
|----------|-------------|
| `PENDIENTE` | Pendiente de liquidación |
| `COMPLETADO` | Liquidado correctamente |
| `FALLIDO` | Fallo operativo o rechazo |

---

## Tabla `"Contract"` (modelo Prisma: `Contract`)

| Columna     | Tipo SQL        | NOT NULL | Default / notas Prisma           | Clave |
|-------------|-----------------|----------|----------------------------------|--------|
| `id`        | TEXT            | sí       | `cuid()`                         | PK     |
| `title`     | TEXT            | sí       | —                                |        |
| `status`    | TEXT            | sí       | —                                |        |
| `mainApp`   | TEXT            | sí       | `'contratos'`                    |        |
| `subApp`    | TEXT            | no       | —                                |        |
| `metadata`  | JSONB           | no       | —                                |        |
| `ownerId`   | TEXT            | sí       | FK → `"User"."id"`               | FK     |
| `createdAt` | TIMESTAMP(3)   | sí       | `now()`                          |        |
| `updatedAt` | TIMESTAMP(3)   | sí       | `@updatedAt`                     |        |

**FK:** `ownerId` → `"User"."id"`, `ON DELETE CASCADE`.

**Índices Prisma:** `@@index([ownerId])`, `@@index([mainApp])`.

---

## Tabla `"Document"` (modelo Prisma: `Document`)

| Columna      | Tipo SQL        | NOT NULL | Default / notas Prisma          | Clave |
|--------------|-----------------|----------|----------------------------------|--------|
| `id`         | TEXT            | sí       | `cuid()`                         | PK     |
| `name`       | TEXT            | sí       | —                                |        |
| `fileUrl`    | TEXT            | sí       | —                                |        |
| `fileType`   | TEXT            | sí       | MIME                             |        |
| `size`       | INTEGER         | sí       | bytes                            |        |
| `bucketPath` | TEXT            | sí       | ruta en Storage                  |        |
| `mainApp`    | TEXT            | sí       | sin default en Prisma (obligatorio al insertar) | |
| `subApp`     | TEXT            | no       | —                                |        |
| `metadata`   | JSONB           | no       | —                                |        |
| `ownerId`    | TEXT            | sí       | FK → `"User"."id"`               | FK     |
| `createdAt`  | TIMESTAMP(3)   | sí       | `now()`                          |        |
| `updatedAt`  | TIMESTAMP(3)   | sí       | `@updatedAt`                     |        |

**FK:** `ownerId` → `"User"."id"`, `ON DELETE CASCADE`.

**Índices Prisma:** `@@index([ownerId])`, `@@index([mainApp])`.

---

## Enum `InternalApiKeyScope` (Prisma)

| Variante Prisma   | Significado                          |
|-------------------|--------------------------------------|
| `READ_ONLY`       | Invocaciones de lectura / consulta   |
| `FULL_ACCESS`     | Mutación, indexación o rutas completas según contrato del Engine |

---

## Tabla `"InternalApiKey"` (modelo Prisma: `InternalApiKey`)

| Columna             | Tipo SQL        | NOT NULL | Default / notas Prisma              | Clave |
|---------------------|-----------------|----------|-------------------------------------|--------|
| `id`                | TEXT            | sí       | `cuid()`                            | PK     |
| `name`              | TEXT            | sí       | etiqueta humana (ej. motor)         |        |
| `apiKey`            | TEXT            | sí       | secreto o hash; **UNIQUE**          | UNIQUE |
| `scope`             | TEXT (enum)     | sí       | `READ_ONLY` por defecto             |        |
| `targetAppOrEngine` | TEXT            | sí       | slug App/Engine autorizado          |        |
| `ownerId`           | TEXT            | sí       | FK → `"User"."id"`                  | FK     |
| `createdAt`         | TIMESTAMP(3)    | sí       | `now()`                             |        |
| `updatedAt`         | TIMESTAMP(3)    | sí       | `@updatedAt`                        |        |

**FK:** `ownerId` → `"User"."id"`, `ON DELETE CASCADE`.

**Índices Prisma:** `@@index([ownerId])`, `@@index([targetAppOrEngine])`.

**Espejo de comunicación:** `docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md`.

---

## Grafo de relaciones (FK)

```text
User (1) ──< Expediente        userId (1:1, UNIQUE)
User (1) ──  FinancialAccount  userId (1:1, UNIQUE)
FinancialAccount (1) ──< Transaction  accountId
User (1) ──< Bot               ownerId
User (1) ──< Contract          ownerId
User (1) ──< Document          ownerId
User (1) ──< InternalApiKey    ownerId
```

---

## RLS (Supabase)

| Recurso | Estado en repo | Diseño objetivo |
|---------|----------------|-----------------|
| Tablas `User`, `Expediente`, `FinancialAccount`, `Transaction`, `Bot`, `Contract`, `Document`, `InternalApiKey` | Políticas no versionadas en SQL en este repositorio | Owner-only en filas con `ownerId` / `userId` / `accountId` vía `User`: visibles/mutables según Route Handlers con Prisma + cookie de sesión. `FinancialAccount` y `Transaction` se leen en `GET /api/v1/finanzas` con el mismo criterio; `GET /api/v1/finanzas/liquidity-forecast` lee la misma cuenta y todas las `Transaction` con `status` `COMPLETADO` (pronóstico en caliente, sin tablas nuevas). Las filas `InternalApiKey` solo deben exponerse a servicios que validen el secreto fuera de lectura pública. |
| Storage `fifer-documents`, `fifer-avatars` | Buckets creados vía migración; políticas detalladas en panel / futuras migraciones | Alinear prefijos de `bucketPath` con `ownerId`; backend con service role documentado (`supabaseAdmin`) para uploads servidor. |

---

## Migraciones y alineación

| Artefacto | Descripción |
|-----------|-------------|
| `prisma/schema.prisma` | Fuente canónica del cliente Prisma. |
| `supabase/migrations/20260411020804_create_storage_buckets.sql` | Buckets Storage. |
| `supabase/migrations/20260411143000_standardize_fifer_adn.sql` | `sourceApp` → `mainApp` (si existía); columnas `subApp`, `metadata`. |
| `prisma/migrations/20260412104500_phase6_financial_domain_and_bot_source_app` | `Bot.sourceApp` opcional; enums y tablas `FinancialAccount`, `Transaction`. |
| `src/types/supabase-database.ts` | Tipos Row/Insert/Update para cliente Supabase JS (deben coincidir con columnas anteriores). |

---

## Storage (referencia operativa)

| Bucket | Uso | Notas |
|--------|-----|-------|
| `fifer-documents` | Documentos privados | Insert/select vía servidor; ver `src/lib/storage.ts`. |
| `fifer-avatars` | Avatares / logos | Puede ser público según política de bucket. |
