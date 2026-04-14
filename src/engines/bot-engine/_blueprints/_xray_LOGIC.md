# Plano — Lógica `bot-engine`

## UBICACIÓN LÓGICA

`FIFER://engines/bot-engine`

## Comportamiento

- `getUserBots`: `findMany` por `ownerId`, orden `updatedAt desc`.
- `getBotDetails` / `updateBotStatus`: `findFirst` / `update` con `id` + `ownerId` para evitar fugas cross-tenant.
- `mapBotStatusToEstado`: mapea strings de BD a `activo` | `pausado` | `error` para BDUI.

## Dependencias

- `@/lib/prisma` — cliente Prisma.
- Registro: `src/engines/bot-engine/index.ts` → `EngineRegistry.register('bot-engine', ...)`.

## CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)

- error
- bot_engine_id
- prisma
- userid
- botid
- status
- bot-engine
- botengine
- engine
- where
- botenginehealth
- log_prefix
- ownerid
- pausado
