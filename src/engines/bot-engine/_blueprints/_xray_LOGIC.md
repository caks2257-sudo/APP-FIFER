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
