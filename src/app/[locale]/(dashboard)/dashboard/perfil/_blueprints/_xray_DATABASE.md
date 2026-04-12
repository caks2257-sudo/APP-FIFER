# Persistencia Nativa (Supabase & Prisma) — dashboard/perfil

Ordenanza §8 — **Prohibido SQL manual** en aplicación; toda interacción vía **Prisma Client** centralizado. Documentar aquí SCHEMA (Prisma), reglas **RLS** y **MIGRATIONS**.

Mantener este plano alineado con `prisma/schema.prisma`, migraciones aplicadas y políticas desplegadas en Supabase.

## SCHEMA (Prisma)

### Model Name
- _(Nombre del modelo en `schema.prisma`, p. ej. `ModuleRecord`)_

### Fields
| Field | Tipo Prisma | Notas |
|-------|-------------|-------|
| `id` | `String @id @default(cuid())` | PK |
| `ownerId` | `String` | FK a usuario (RLS owner-only) |
| _(añadir)_ | | |

### Relations
- _(Listar `@relation`, campos FK, `onDelete`, índices compuestos.)_

## RLS (Supabase)

### Supabase RLS Policy (Owner-only por defecto)
- **Recurso:** _(tabla o vista expuesta)_
- **SELECT:** `auth.uid() = owner_id` (ajustar nombre de columna al modelo).
- **INSERT / UPDATE / DELETE:** mismo criterio de propiedad; restringir columnas sensibles según negocio.
- **Servicio / backend:** operaciones elevadas solo vía Prisma con contexto de servicio, nunca desde cliente sin RLS coherente.

## MIGRATIONS
| Migración | Descripción |
|-----------|-------------|
| _(nombre o timestamp)_ | _(resumen del cambio)_ |
