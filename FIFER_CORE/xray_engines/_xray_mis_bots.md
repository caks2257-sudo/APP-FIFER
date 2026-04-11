# Espejo X-Ray — Mis Bots (persistencia + API + Zod)

---

## 1. Modelo Prisma `Bot` (`prisma/schema.prisma`)

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | `String` @id @default(cuid()) | |
| `name` | `String` | |
| `status` | `String` | libre en esquema (no enum Prisma) |
| `modelId` | `String` | |
| `avatarUrl` | `String?` | |
| `mainApp` | `String` @default("misbots") | ADN multi-tenant |
| `subApp` | `String?` | |
| `metadata` | `Json?` | |
| `ownerId` | `String` | FK → `User.id`, onDelete Cascade |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

Índices: `@@index([ownerId])`, `@@index([mainApp])`.

Relación: `User.bots` ↔ `Bot.owner`.

---

## 2. Contrato Zod BDUI (`src/types/schemas.ts`)

**`botEstadoSchema`:** `z.enum(['activo', 'pausado'])`.

**`BotRowSchema`:**

- `id`: `string` min 1  
- `nombre`: `string` min 1  
- `estado`: `botEstadoSchema`  
- `modeloAsignado`: `string` min 1  
- `costoPromedioUF`: `number` nonnegative  
- `avatarUrl`: `string` optional  

**`BotDataSchema`:** `schemaVersion?`, `bots` = array `BotRowSchema` (default `[]`), `degraded?`, `errorMessage?`, `errorCode?`.

Tipos exportados: `BotRow`, `BotDataPayload`.

---

## 3. Desalineación código ↔ base de datos

`src/app/api/v1/misbots/route.ts` — `GET` devuelve un **stub en memoria** tipado como `BotDataPayload` (`schemaVersion: '1.0-misbots'`, array `bots` fijo de tres ítems). **No** ejecuta Prisma ni Supabase sobre el modelo `Bot`.

---

## 4. Rutas API que afectan a bots (handlers)

| Ruta | Rol |
|------|-----|
| `GET /api/v1/misbots` | Stub `BotDataPayload` (ver §3). |
| `POST /api/v1/misbots/generate-avatar` | Requiere `botId`, `prompt`, `core`; motor `ai-fallback:image-gen`. |
| `POST /api/v1/misbots/test-comms` | Requiere `botId`, `core`; opcional `botNombre`, `provider`; motor `ai-fallback:comms`. |

UI que llama avatares / comms: `src/components/v0-ingestion/boxes/FiferMisbotsMain.tsx` (`GENERATE_AVATAR_PATH`, `TEST_COMMS_PATH`).

Sonda salud: `src/engines/system-health/index.ts` hace `GET` a `/api/v1/misbots` como ruta interna monitoreada.

---

## 5. Mapa de nombres (Prisma ↔ stub API ↔ Zod)

| Concepto | Prisma `Bot` | Stub `GET /api/v1/misbots` | `BotRowSchema` |
|----------|----------------|---------------------------|----------------|
| Nombre | `name` | `nombre` | `nombre` |
| Estado | `status` (string) | `estado` (`activo` / `pausado`) | `estado` (enum Zod) |
| Modelo | `modelId` | `modeloAsignado` | `modeloAsignado` |
| Costo UF | — (sin columna en `Bot`) | `costoPromedioUF` | `costoPromedioUF` |
| Avatar | `avatarUrl` | no en stub actual | `avatarUrl` opcional |

Hecho en código: el modelo `Bot` está en `prisma/schema.prisma`; `src/app/api/v1/misbots/route.ts` (`GET`) no invoca Prisma ni consulta la tabla `Bot`.
