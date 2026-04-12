# Persistencia — external-bridge-engine

## UBICACIÓN LÓGICA

`FIFER://engines/external-bridge-engine`

**targetAppOrEngine:** `external-bridge-engine`

## SCHEMA (Prisma)

Modelo compartido `ExternalBridgeCredential` en `prisma/schema.prisma`:

| Field | Tipo | Notas |
|-------|------|-------|
| `envKey` | `String @unique` | p.ej. `FLOW_API_KEY` |
| `ciphertextB64` | `String` | payload AES-256-GCM |
| `ivB64` | `String` | nonce 12 bytes |
| `authTagB64` | `String` | GCM tag |
| `updatedBy` | `String?` | email admin |

Cifrado en `src/lib/bridge-credential-crypto.ts`; lectura fusionada en `src/lib/bridge-vault.ts`.

## RLS

Tabla de sistema; solo backend con Prisma (sin exposición directa a cliente). Políticas Supabase: restringir a rol servicio en despliegues futuros si se expone vía API SQL.

## MIGRATIONS

| Migración | Descripción |
|-----------|-------------|
| (push local) | Creación `ExternalBridgeCredential` |
