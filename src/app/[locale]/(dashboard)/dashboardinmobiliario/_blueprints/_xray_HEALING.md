# Plano de Resiliencia - DashboardInmobiliario

## Circuit Breaker

- **Threshold:** 3 fallos consecutivos antes de abrir el circuito (registro central `box-circuit-breaker`).
- **Half-open / cooldown:** misma política que el resto de circuitos contados (ventana ~45s tras apertura, luego cierre y reinicio de racha).

## Inmunidad del Box principal

- **Componente:** `src/components/v0-ingestion/boxes/FiferInmobiliarioMain.tsx`.
- **Circuito:** `fifer-inmobiliario-main` (registrado en `src/utils/box-circuit-breaker.ts`).
- **Comportamiento:**
  - Hidratación: `fetchRealBoxDataForBridge('fiferInmobiliarioMain')` + parseo con `InmobiliarioDataSchema.safeParse` dentro de `try/catch`.
  - **Ante fallo de parseo o excepción en ese bloque:** `boxCircuitBreaker.recordFailure('fifer-inmobiliario-main')` — acumula fallos hacia el umbral.
  - **Con circuito abierto:** no se reintenta el fetch; la UI muestra aislamiento del Box (mensaje explícito + acción local “Reintentar” que ejecuta `reset` del circuito y dispara nueva generación de datos).
- **Contorno:** el árbol sigue envuelto en `BoxErrorBoundary` para errores de render no capturados por el `try/catch` de datos.
