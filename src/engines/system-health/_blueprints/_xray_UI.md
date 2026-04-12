# Espejo X-Ray — UI (`system-health` / Sala de Guerra)

## UBICACIÓN LÓGICA

`FIFER://ENGINE/SYSTEM_HEALTH`

## Alcance

Superficie documentada: **Sala de Guerra** (`WarRoomPanel`) consumida por la App Desarrollador. El motor `system-health` no renderiza JSX; aporta datos y sondas consumidos por `GET /api/v1/war-room` y rutas relacionadas.

## Estándar X-RAY UI — vistas de la Sala de Guerra

| Componente | Origen de datos (endpoint / payload) | Vista preferida | Vista fallback | Opciones de visualización |
|------------|----------------------------------------|-----------------|----------------|---------------------------|
| `WarRoomPanel` → cuadrante motores | `GET /api/v1/war-room` → `engines` (`Record<string, EngineSlotSnapshot>` mapeado desde `GlobalHealthStatus['engines']` en cliente) | Lista con `PulseDot` por motor | Lista plana de ids + texto degradado si falta `note` | N/A (lista); futuro: Ping Live |
| `WarRoomPanel` → cuadrante latencias | `GET /api/v1/war-room` → `bridgeLatencies` (`BridgeActivePing[]` vía `external-bridge-engine.pingAllActiveIntegrations`) | Barras horizontales proporcionales (`LatencyBars`) | Lista plana etiqueta + ms (misma data en filas) | **Barras** (actual) · **Líneas** / **Torta** → placeholder «requiere v0» hasta integración v0_pack |
| `WarRoomPanel` → cuadrante env-manager | `GET /api/v1/war-room` → `envManagerLog` (`{ ts, level, message }[]`) | Consola tipo log (`<pre>`) | Misma lista como bloques de texto si el render estructurado falla | N/A |
| `WarRoomPanel` → cuadrante salud arquitectónica | `GET /api/v1/war-room` → `architectureHealth` (`ArchitectureHealthSnapshot` desde `runArchitectureProbe()`; también `GET /api/v1/system-health/architecture`) | Tarjetas `<dl>` (constitución, GPS, compliance, huérfanos) | Mensaje «Sin datos» + lista raw de campos si el snapshot es `null` | N/A |
| `TelemetryHeaderBox` (cabecera Sala de Guerra) | Props `healthStats` derivadas del agregado en `src/utils/developer-telemetry.ts` + pestaña war-room en Desarrollador | Badges LIVE/MOCK explícitos (§16.5) | Contadores en texto plano si el widget falla | N/A |

## Reflejo de código

| Pieza | Archivo(s) |
|-------|----------------|
| Panel Sala de Guerra | `src/components/system/WarRoomPanel.tsx` |
| API agregada | `src/app/api/v1/war-room/route.ts` (`WarRoomPayload`) |
| Consumo en App | `src/app/[locale]/(dashboard)/desarrollador/page.tsx` (`parseWarRoom`, `fetch('/api/v1/war-room')`) |
| Telemetría cabecera | `src/utils/developer-telemetry.ts` (`telemetryFromWarRoom`) |
| Tipos Bridge | `@fifer/external-bridge-engine` — `BridgeActivePing` |
| Sonda arquitectura | `src/engines/system-health/architecture-probe.ts` |

## Grid / tokens (§0 Nevado Técnico)

- Fondo `#0A0F1E`, acento `#EAB308`, bordes sutiles `border-slate-700/35`.
- **Layout §19:** contenedor principal `grid` con `items-start` y cuadrantes `break-inside-avoid` / sin `min-h` artificial que iguale alturas entre columnas.

## Graceful degradation (§20)

- Payload degradado (`schemaVersion: '1.0-war-room-degraded'`) → normalización en `src/utils/fifer-box-data-bridge.ts` (`normalizeWarRoomPayload`) para no romper la UI.
- Vistas de gráfico no soportadas (líneas/torta en latencias): placeholder explícito hasta componentes v0; la vista barras permanece como fallback operativo.
