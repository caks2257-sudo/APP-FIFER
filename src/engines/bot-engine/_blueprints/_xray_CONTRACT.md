# Plano — Contrato `bot-engine`

## UBICACIÓN LÓGICA

`FIFER://engines/bot-engine`

## Contrato público (TypeScript)

- **`getUserBots(userId: string): Promise<Bot[]>`** — lista de filas `Bot` Prisma para el propietario.
- **`getBotDetails(botId, userId): Promise<Bot | null>`** — lectura por id con ownership `ownerId`.
- **`updateBotStatus(botId, userId, status)`** — actualiza `Bot.status` (string) con validación de ownership.
- **`getHealthStatus()`** — `{ ok:true, engineId:'bot-engine' }` para `system-health`.

## Entradas / salidas

- Persistencia: modelo Prisma `Bot` (`prisma/schema.prisma`, tabla `Bot`).
- No expone HTTP; las rutas API consumen el motor in-process vía `EngineRegistry.use('bot-engine')`.
