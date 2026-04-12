# Plano UI global — FIFER (espejo de producto)

Complementa los planos `_xray_UI.md` por App bajo `src/**/_blueprints/`. Tema: **Nevado Técnico** (§0 `.cursorrules`).

## Telemetría — pestaña APIs externas (Desarrollador, §16)

- **Cabecera:** `TelemetryHeaderBox` (`src/components/system/TelemetryHeaderBox.tsx`) muestra anillo % Live, conteos explícitos **LIVE** y **MOCK**, y latencia media agregada desde sondas Bridge (`/api/v1/war-room` → `bridgeLatencies`).
- **Panel:** `ExternalConnectionsPanel` (`src/components/system/ExternalConnectionsPanel.tsx`) muestra por **fila de credencial** (y pulso de **caja** en grupos multi-llave) un **micro-indicador de latencia (ms)** con semáforo: bajo 800 ms verde, 800–1500 ms ámbar, 1500 ms o más o fallo rojo; modo **MOCK** o sin sonda → `--- ms`.
- **Cruce sondas ↔ filas:** `src/utils/bridge-latency-mapping.ts` — `OPENAI_*` → sonda OpenAI API; `SUPABASE` / `groupId supabase` → Supabase (auth health); `FLOW_API_KEY` / `integrationId payments` → Flow (flow.cl).
