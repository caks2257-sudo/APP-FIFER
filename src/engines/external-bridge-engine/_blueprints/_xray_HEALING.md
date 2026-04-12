# Healing — external-bridge-engine

## UBICACIÓN LÓGICA

`FIFER://engines/external-bridge-engine`

**targetAppOrEngine:** `external-bridge-engine`

## Estrategia

- **MOCK automático:** sin credencial válida, no se invocan redes externas; respuestas deterministas desde `packages/.../src/mocks`.
- **Errores de registro:** `try/catch` en `src/engines/external-bridge-engine/index.ts` al registrar en `EngineRegistry`.
- **Cifrado:** si `FIFER_BRIDGE_MASTER_KEY` falta, POST de credenciales responde 503; GET de estado sigue operando con env únicamente.
