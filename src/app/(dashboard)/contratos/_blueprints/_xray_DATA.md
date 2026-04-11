# Plano DATA — Control de Contratos

## Esquema Zod (fila canónica)

Definido en `@/schemas/schemas` como `ContratosDataSchema` / tipo `ContratosDataRow`:

| Campo conceptual | Campo Zod | Notas |
|------------------|------------|--------|
| ID | `id` | `string`, mínimo 1 carácter |
| Local | `localNombre` | Local en corredor Chicureo (nombre canónico en ADN) |
| Monto | `montoUF` | `number` ≥ 0 (arriendo en UF) |
| Vencimiento | `vencimiento` | `string` ISO 8601 válida (fecha o datetime) |

Campos adicionales en la misma fila (presentes en UI y esquema):

- **`arrendatario`:** `string` mínimo 1.
- **`estado`:** enum `Vigente` | `Por Vencer` | `Alerta` (`contratoEstadoSchema`).

## Payload de lista

- **`contratosListPayloadSchema`:** objeto con `contratos` (array de `ContratosDataSchema`, default `[]`), `schemaVersion` opcional, `degraded` / `errorMessage` / `errorCode` opcionales (metadatos bridge §0.25).

## Puente de datos (`fifer-box-data-bridge.ts`)

`ContratosPageShell` importa desde `@/utils/fifer-box-data-bridge`:

- **`fiferContratosMainFetchUrl()`** — URL efectiva del fetch (ruta `fiferContratosMain` → `/api/v1/contracts/chicureo`).
- **`routeContratosApiWithValidation(json)`** — normaliza la respuesta API al shape esperado antes del `safeParse` Zod.
- **`buildDegradedNormalized(reason, errorCode?)`** — payload degradado cuando HTTP falla o la lista no valida; reintento de parse con shape controlado.

Flujo resumido: `fetch` → JSON → `routeContratosApiWithValidation` (o degradado por status) → `contratosListPayloadSchema.safeParse`; si falla, segunda pasada con `buildDegradedNormalized`.

## Circuito auxiliar Chicureo

- Además del bridge, el shell usa `recordFailure` / `recordSuccess` / `isContractsCircuitOpen` desde `@/utils/contracts-chicureo-circuit` para el circuito legacy de contratos.
