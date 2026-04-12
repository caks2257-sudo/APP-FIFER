# Espejo técnico — Persistencia (App `afiliados`)

## UBICACIÓN LÓGICA

`FIFER://APP/AFILIADOS`

**Alcance:** App Afiliados opera sobre el **esquema compartido** del monorepo (`User`, `Bot`, `Contract`, `Document`); no declara modelos Prisma adicionales bajo este segmento de ruta.  
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

## Tabla `"User"` (referencia compartida)

| Columna   | Tipo SQL | NOT NULL | Notas Prisma |
|-----------|----------|----------|--------------|
| `id`      | TEXT     | sí       | PK `cuid()`  |
| `email`   | TEXT     | sí       | UNIQUE       |
| `name`    | TEXT     | sí       |              |
| `role`    | TEXT     | sí       | default `user` |
| `tier`    | TEXT     | sí       | default `free` |

**Relaciones salientes (Prisma) relevantes para datos de plataforma:** `expediente`, `financialAccount`, `bots`, `contracts`, `documents`, `internalApiKeys` según `prisma/schema.prisma`.

## RLS (Supabase)

| Recurso | Diseño en repo |
|---------|----------------|
| Tablas core | Políticas no versionadas en SQL en este repositorio; acceso a datos de negocio vía Route Handlers y Prisma con contexto de servicio. |
