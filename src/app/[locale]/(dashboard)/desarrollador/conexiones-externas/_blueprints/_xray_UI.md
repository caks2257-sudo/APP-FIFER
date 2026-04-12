# UI — Conexiones externas

## UBICACIÓN LÓGICA

`FIFER://app/desarrollador/conexiones-externas`

**targetAppOrEngine:** `desarrollador`

## Paleta

- Fondo: `#0A0F1E`
- Acento: `#EAB308`
- Tarjetas: bordes `white/10`, sombra inset amarilla suave.

## Componentes

- `src/components/system/ExternalConnectionsPanel.tsx` — hub por Macro-Pilar (`INTELIGENCIA_ARTIFICIAL`, `FINANZAS_PAGOS`, `ECOMMERCE`, `INFRAESTRUCTURA`, `REDES_SOCIALES`), cajas independientes, estado Mock/Live, rotación solo en localhost (`useIsLocalhostClient`).
- **Pulso individual (§16):** cada fila muestra latencia ms + semáforo cruzando `bridgeLatencies` de `/api/v1/war-room` vía `resolvePingForRow` (`src/utils/bridge-latency-mapping.ts`); cabecera de la pestaña en `TelemetryHeaderBox` con conteos LIVE/MOCK explícitos.
- Hook `useExternalBridge` (`src/hooks/useExternalBridge.ts`)
