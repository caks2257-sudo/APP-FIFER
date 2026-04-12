# Datos — Conexiones externas

## UBICACIÓN LÓGICA

`FIFER://app/desarrollador/conexiones-externas`

**targetAppOrEngine:** `desarrollador`

## APIs

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/api/v1/external-bridge/status` | Sesión; `schemaVersion` 2.x unificado + auto-descubrimiento + `iconKey` |
| POST | `/api/v1/system/external-bridge/credentials` | Admin + dev; `{ envKey, secret }` o `{ integrationId, secret }` (Bridge) |

Motor: `EngineRegistry.use('external-bridge-engine')` + `loadDecryptedVault()`.
