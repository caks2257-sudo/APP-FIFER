# Lógica — system-engine:env-manager

## UBICACIÓN LÓGICA

`FIFER://engines/system-engine/sub-engines/env-manager`

**targetAppOrEngine:** `system-engine:env-manager`

- Resolución de ruta: `path.join(process.cwd(), '.env')`.
- Guardia única: `assertEnvFileAccessAllowed()` → `NODE_ENV === 'development'`.
- Registro en `EngineRegistry` id `system-engine:env-manager`.
