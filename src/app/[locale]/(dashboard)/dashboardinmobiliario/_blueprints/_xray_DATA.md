# Plano de Datos - DashboardInmobiliario

## Esquemas Zod (`src/types/schemas.ts`)

- **`inmobiliarioEstadoSchema`**: `Disponible` | `En construcción` | `Comercialización` | `Agotado`.
- **`InmobiliarioPropiedadSchema`**: fila canónica — `id` (string), `nombreProyecto` (string), `unidadesDisponibles` (entero ≥ 0), `estado` (enum anterior).
- **`InmobiliarioDataSchema`**: payload BDUI del módulo — `propiedades` (array de filas), `schemaVersion` opcional, flags opcionales `degraded`, `errorMessage`, `errorCode` (degradación §0.25).

Tipos inferidos: `InmobiliarioEstado`, `InmobiliarioPropiedad`, `InmobiliarioDataPayload`.

## Bridge (`src/utils/fifer-box-data-bridge.ts`)

- **Ruta:** `FIFER_BOX_DATA_ROUTES.fiferInmobiliarioMain` → `GET /api/v1/inmobiliario` (mock local hasta API de dominio).
- **Normalización:** `normalizeInmobiliarioPayload` / `routeApiResponseToFiferBoxData(..., 'fiferInmobiliarioMain')` — acepta `propiedades` o `properties`, envoltorio opcional `data`, campos alias en filas.
- **Validación:** `routeInmobiliarioApiWithValidation(json)` — `InmobiliarioDataSchema.safeParse`; si falla → `buildDegradedInmobiliarioNormalized` (`propiedades: []`, `degraded: true`, `errorCode` típico `ZOD_MISMATCH`).
- **Fetch atómico:** `fetchRealBoxDataForBridge('fiferInmobiliarioMain')` — HTTP no OK o red → `buildDegradedInmobiliarioNormalized` con `HTTP_ERROR` / `FETCH_ERROR`; éxito → payload validado (o degradado vía Zod).
- **URL helper:** `fiferInmobiliarioMainFetchUrl()`.

## Endpoint mock

- **`src/app/api/v1/inmobiliario/route.ts`**: `GET` devuelve JSON acorde a `InmobiliarioDataSchema` (`schemaVersion`, `propiedades` de ejemplo).
