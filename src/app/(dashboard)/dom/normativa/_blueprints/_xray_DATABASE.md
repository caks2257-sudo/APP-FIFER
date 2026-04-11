# Espejo técnico — Persistencia (Sub-App `dom/normativa`)

## UBICACIÓN LÓGICA

`FIFER://ENGINE/NORMATIVA`

**targetAppOrEngine:** `normativa`

**Alcance:** UI de normativa DOM bajo la ruta canónica `/dom/...` (grupo `(dashboard)`); persiste y consume el **esquema compartido** del monorepo salvo tablas de sistema explícitas.  
**Clase de documento:** Espejo técnico 1:1 con `prisma/schema.prisma` para las tablas que este flujo toca. Si hay divergencia, prevalece `schema.prisma`.  
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

Documentar aquí únicamente modelos y columnas que esta Sub-App lee o escribe; el resto remite al espejo global.
