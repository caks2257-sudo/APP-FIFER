# Plano de Datos - misbots

## Esquemas Zod (`src/types/schemas.ts`)

- **`botEstadoSchema`**: `activo` | `pausado`.
- **`BotRowSchema`**: fila canónica — `id`, `nombre`, `estado`, `modeloAsignado` (string, ej. `gpt-4o`, `gemini-flash`), `costoPromedioUF` (número ≥ 0).
- **`BotDataSchema`**: payload BDUI del módulo — `bots` (array de filas), `schemaVersion` opcional, flags opcionales `degraded`, `errorMessage`, `errorCode` (degradación §0.25).

Tipos inferidos: `BotEstado`, `BotRow`, `BotDataPayload`.

## Bridge (`src/utils/fifer-box-data-bridge.ts`)

- **Ruta:** `FIFER_BOX_DATA_ROUTES.fiferMisbotsMain` → `GET /api/v1/misbots`.
- **Normalización:** `normalizeBotsPayload` / `routeApiResponseToFiferBoxData(..., 'fiferMisbotsMain')` — acepta `bots`, alias `flota` / `items`, envoltorio opcional `data`, alias de fila (`modelo`, `costoUF`, etc.).
- **Validación:** `routeBotsApiWithValidation(json)` — `BotDataSchema.safeParse`; si falla → `buildDegradedBotsNormalized` (`bots: []`, `degraded: true`, `errorCode` típico `ZOD_MISMATCH`).
- **Fetch atómico:** `fetchRealBoxDataForBridge('fiferMisbotsMain')` — HTTP no OK o red → `buildDegradedBotsNormalized` con `HTTP_ERROR` / `FETCH_ERROR`; éxito → payload validado (o degradado vía Zod).
- **URL helper:** `fiferMisbotsMainFetchUrl()`.

## Endpoint mock

- **`src/app/api/v1/misbots/route.ts`**: `GET` devuelve JSON acorde a `BotDataPayload` (`schemaVersion`, `bots` con tres filas de ejemplo).
