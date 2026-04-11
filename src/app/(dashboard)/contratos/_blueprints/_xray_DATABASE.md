# Espejo técnico — Persistencia (App `contratos`)

## UBICACIÓN LÓGICA

`FIFER://APP/CONTRATOS`

**Alcance:** App de contratos; persiste y consume el **esquema compartido** (`User`, `Bot`, `Contract`, `Document`).  
**Clase de documento:** Espejo técnico 1:1 con `prisma/schema.prisma`. Si hay divergencia, prevalece `schema.prisma`.  
**Espejo global ampliado:** `prisma/_xray_DATABASE_GLOBAL.md`.

## Mapeo Prisma → SQL (columnas escalares)

| Prisma      | PostgreSQL (típico) |
|------------|----------------------|
| `String`   | `TEXT`               |
| `Int`      | `INTEGER`            |
| `DateTime` | `TIMESTAMP(3)`       |
| `Json`     | `JSONB`              |
| `String?`  | `TEXT NULL`          |
| `Json?`    | `JSONB NULL`         |

---

## Tabla `"User"` (modelo Prisma: `User`)

| Columna     | Tipo SQL       | NOT NULL | Default / notas Prisma | Clave  |
|-------------|----------------|----------|-------------------------|--------|
| `id`        | TEXT           | sí       | `cuid()`                | PK     |
| `email`     | TEXT           | sí       | —                       | UNIQUE |
| `name`      | TEXT           | sí       | —                       |        |
| `role`      | TEXT           | sí       | `'user'`                |        |
| `tier`      | TEXT           | sí       | `'free'`                |        |
| `createdAt` | TIMESTAMP(3)   | sí       | `now()`                 |        |
| `updatedAt` | TIMESTAMP(3)   | sí       | `@updatedAt`            |        |

**Relaciones salientes (Prisma):** `bots Bot[]`, `contracts Contract[]`, `documents Document[]`.

---

## Tabla `"Bot"` (modelo Prisma: `Bot`)

| Columna     | Tipo SQL       | NOT NULL | Default / notas Prisma | Clave |
|-------------|----------------|----------|-------------------------|-------|
| `id`        | TEXT           | sí       | `cuid()`                | PK    |
| `name`      | TEXT           | sí       | —                       |       |
| `status`    | TEXT           | sí       | —                       |       |
| `modelId`   | TEXT           | sí       | —                       |       |
| `avatarUrl` | TEXT           | no       | —                       |       |
| `mainApp`   | TEXT           | sí       | `'misbots'`             |       |
| `subApp`    | TEXT           | no       | —                       |       |
| `metadata`  | JSONB          | no       | —                       |       |
| `ownerId`   | TEXT           | sí       | FK → `"User"."id"`      | FK    |
| `createdAt` | TIMESTAMP(3)   | sí       | `now()`                 |       |
| `updatedAt` | TIMESTAMP(3)   | sí       | `@updatedAt`            |       |

**FK:** `ownerId` → `"User"."id"`, `ON DELETE CASCADE`.

**Índices Prisma:** `@@index([ownerId])`, `@@index([mainApp])`.

---

## Tabla `"Contract"` (modelo Prisma: `Contract`)

| Columna     | Tipo SQL       | NOT NULL | Default / notas Prisma | Clave |
|-------------|----------------|----------|-------------------------|-------|
| `id`        | TEXT           | sí       | `cuid()`                | PK    |
| `title`     | TEXT           | sí       | —                       |       |
| `status`    | TEXT           | sí       | —                       |       |
| `mainApp`   | TEXT           | sí       | `'contratos'`           |       |
| `subApp`    | TEXT           | no       | —                       |       |
| `metadata`  | JSONB          | no       | —                       |       |
| `ownerId`   | TEXT           | sí       | FK → `"User"."id"`      | FK    |
| `createdAt` | TIMESTAMP(3)   | sí       | `now()`                 |       |
| `updatedAt` | TIMESTAMP(3)   | sí       | `@updatedAt`            |       |

**FK:** `ownerId` → `"User"."id"`, `ON DELETE CASCADE`.

**Índices Prisma:** `@@index([ownerId])`, `@@index([mainApp])`.

---

## Tabla `"Document"` (modelo Prisma: `Document`)

| Columna      | Tipo SQL       | NOT NULL | Default / notas Prisma | Clave |
|--------------|----------------|----------|-------------------------|-------|
| `id`         | TEXT           | sí       | `cuid()`                | PK    |
| `name`       | TEXT           | sí       | —                       |       |
| `fileUrl`    | TEXT           | sí       | —                       |       |
| `fileType`   | TEXT           | sí       | MIME                    |       |
| `size`       | INTEGER        | sí       | bytes                   |       |
| `bucketPath` | TEXT           | sí       | ruta en Storage         |       |
| `mainApp`    | TEXT           | sí       | obligatorio al insertar |       |
| `subApp`     | TEXT           | no       | —                       |       |
| `metadata`   | JSONB          | no       | —                       |       |
| `ownerId`    | TEXT           | sí       | FK → `"User"."id"`      | FK    |
| `createdAt`  | TIMESTAMP(3)   | sí       | `now()`                 |       |
| `updatedAt`  | TIMESTAMP(3)   | sí       | `@updatedAt`            |       |

**FK:** `ownerId` → `"User"."id"`, `ON DELETE CASCADE`.

**Índices Prisma:** `@@index([ownerId])`, `@@index([mainApp])`.

---

## Grafo de relaciones (FK)

```text
User (1) ──< Bot        ownerId
User (1) ──< Contract   ownerId
User (1) ──< Document   ownerId
```

---

## RLS (Supabase)

| Recurso | Estado en repo | Diseño objetivo |
|---------|----------------|-----------------|
| `User`, `Bot`, `Contract`, `Document` | Sin políticas SQL versionadas aquí | Owner-only por `ownerId`; mapeo con `auth.uid()` según identidad. |
| Storage | Ver migración buckets | Coherencia `bucketPath` / `ownerId`; uploads servidor en `src/lib/storage.ts`. |

---

## Migraciones relevantes

| Migración | Descripción |
|-----------|-------------|
| `20260411020804_create_storage_buckets.sql` | Buckets `fifer-documents`, `fifer-avatars`. |
| `20260411143000_standardize_fifer_adn.sql` | Renombre `sourceApp` → `mainApp` si aplica; `subApp`, `metadata`. |
