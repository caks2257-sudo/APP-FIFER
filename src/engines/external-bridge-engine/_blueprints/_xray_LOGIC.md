# Lógica — external-bridge-engine

## UBICACIÓN LÓGICA

`FIFER://engines/external-bridge-engine`

**targetAppOrEngine:** `external-bridge-engine`

## Implementación

- **Paquete:** `packages/engines/external-bridge-engine/src/` (`BridgeProxy`, adaptadores, mocks).
- **Registro:** `src/engines/external-bridge-engine/index.ts` → `EngineRegistry.register('external-bridge-engine', ...)`.
- **Montaje en health:** `src/engines/system-health/index.ts` importa el motor y lo incluye en `ENGINE_PROBE_IDS`.

## Flujo

1. `BridgeProxy.snapshotAll()` evalúa cada `BRIDGE_ENV_BINDINGS` con env + vault opcional.
2. Adaptadores devuelven mocks coherentes si `mode === 'MOCK'`.
3. APIs Next (`/api/v1/external-bridge/status`, `/api/v1/system/external-bridge/credentials`) son la única superficie HTTP documentada para estado y rotación.
4. `pingAllActiveIntegrations()` (`packages/engines/external-bridge-engine/src/bridge-latency.ts` — `pingBridgeIntegrations`) ejecuta sondas ligeras de latencia hacia OpenAI (API o status público), Supabase `/auth/v1/health` y `flow.cl`; consumida por `GET /api/v1/war-room` (Sala de Guerra §16).

## CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)

- error
- engine_id
- fifer
- case
- external-bridge-engine
- https
- integrationid
- catch
- controller
- externalbridgeengine
- mock
- performance
- pinger
- process
