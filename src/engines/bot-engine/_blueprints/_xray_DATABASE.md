# Plano — Base de datos `bot-engine`

## UBICACIÓN LÓGICA

`FIFER://engines/bot-engine`

## Esquema

- Modelo Prisma **`Bot`** (`prisma/schema.prisma`): `id`, `name`, `status`, `modelId`, `avatarUrl`, `mainApp`, `sourceApp`, `subApp`, `metadata`, `ownerId`, timestamps.
- Índices: `ownerId`, `mainApp`.

## RLS

- Acceso a datos vía Prisma con credenciales de servidor; ownership aplicado en consultas (`ownerId`).
