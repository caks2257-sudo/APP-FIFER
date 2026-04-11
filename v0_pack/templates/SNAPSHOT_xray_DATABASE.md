<!--
  SNAPSHOT v0_pack — Base técnica para Gemini / v0
  Fuente canónica: prisma/_xray_DATABASE_GLOBAL.md
  Generado como copia de referencia: 2026-04-11
  Si hay conflicto, prevalece prisma/schema.prisma y el archivo fuente en prisma/.
-->

# Espejo técnico — base de datos FIFER (global)

**Clase de documento:** Espejo técnico 1:1 con `prisma/schema.prisma`.  
**Regla de conflicto:** Si este archivo y `schema.prisma` divergen, prevalece `schema.prisma`.  
**Esquema PostgreSQL:** `public` (convención Prisma sin `@@map`).

## Mapeo Prisma → SQL (columnas escalares)

| Prisma     | PostgreSQL (típico) |
|-----------|----------------------|
| `String`  | `TEXT`               |
| `Int`     | `INTEGER`            |
| `DateTime`| `TIMESTAMP(3)`       |
| `Json`    | `JSONB`              |
| `String?` | `TEXT NULL`          |
| `Json?`   | `JSONB NULL`         |

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

**Relaciones salientes (Prisma):** `bots Bot[]`, `contracts Contract[]`, `documents Document[]`, `internalApiKeys InternalApiKey[]`.

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
| `subApp`    | TEXT            | no       | —                                |        |
| `metadata`  | JSONB           | no       | —                                |        |
| `ownerId`   | TEXT            | sí       | FK → `"User"."id"`               | FK     |
| `createdAt` | TIMESTAMP(3)   | sí       | `now()`                          |        |
| `updatedAt` | TIMESTAMP(3)   | sí       | `@updatedAt`                     |        |

**FK:** `ownerId` → `"User"."id"`, `ON DELETE CASCADE` (Prisma: `onDelete: Cascade`).

**Índices Prisma:** `@@index([ownerId])`, `@@index([mainApp])`.

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
User (1) ──< Bot             ownerId
User (1) ──< Contract        ownerId
User (1) ──< Document        ownerId
User (1) ──< InternalApiKey  ownerId
```

---

## RLS (Supabase)

| Recurso | Estado en repo | Diseño objetivo |
|---------|----------------|-----------------|
| Tablas `User`, `Bot`, `Contract`, `Document`, `InternalApiKey` | Políticas no versionadas en SQL en este repositorio | Owner-only: filas visibles/mutables solo si el actor coincide con `ownerId` (mapear `auth.uid()` a `User.id` según estrategia de identidad). Las filas `InternalApiKey` solo deben exponerse a servicios que validen el secreto fuera de lectura pública. |
| Storage `fifer-documents`, `fifer-avatars` | Buckets creados vía migración; políticas detalladas en panel / futuras migraciones | Alinear prefijos de `bucketPath` con `ownerId`; backend con service role documentado (`supabaseAdmin`) para uploads servidor. |

---

## Migraciones y alineación

| Artefacto | Descripción |
|-----------|-------------|
| `prisma/schema.prisma` | Fuente canónica del cliente Prisma. |
| `supabase/migrations/20260411020804_create_storage_buckets.sql` | Buckets Storage. |
| `supabase/migrations/20260411143000_standardize_fifer_adn.sql` | `sourceApp` → `mainApp` (si existía); columnas `subApp`, `metadata`. |
| `src/types/supabase-database.ts` | Tipos Row/Insert/Update para cliente Supabase JS (deben coincidir con columnas anteriores). |

---

## Storage (referencia operativa)

| Bucket | Uso | Notas |
|--------|-----|-------|
| `fifer-documents` | Documentos privados | Insert/select vía servidor; ver `src/lib/storage.ts`. |
| `fifer-avatars` | Avatares / logos | Puede ser público según política de bucket. |
