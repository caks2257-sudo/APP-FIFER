# Espejo X-Ray — contratos TypeScript (`system-health/index.ts`)

**No hay esquemas Zod** en este motor; el contrato es solo TypeScript exportado.

---

## Tipos exportados

### `AiProviderPulse`

`"up" | "degraded" | "down" | "unknown"`

---

### `HealthEndpointSnapshot`

| Campo | Tipo |
|-------|------|
| `pulse` | `AiProviderPulse` |
| `latencyMs` | `number \| null` |
| `note` | `string` |
| `invalidKey?` | `boolean` — solo cuando aplica sonda con API key (401/403). |
| `httpStatus?` | `number` — asignado en `probeOpenAiStatus`, `probeGoogleStatus`, `probeInternalRoute` (`index.ts`). |

---

### `EngineSlotSnapshot`

| Campo | Tipo |
|-------|------|
| `registered` | `boolean` |
| `inService` | `boolean` |
| `loadHint` | `"loaded" \| "not-mounted"` |
| `pulse` | `AiProviderPulse` |
| `note` | `string` |

---

### `GlobalHealthStatus`

| Campo | Tipo |
|-------|------|
| `schemaVersion` | literal `"1.0-system-health"` |
| `capturedAt` | `string` (ISO) |
| `external` | `{ openai: HealthEndpointSnapshot; google: HealthEndpointSnapshot }` |
| `internal` | `{ misbots: HealthEndpointSnapshot; contratos: HealthEndpointSnapshot }` |
| `engines` | `{ byId: Record<string, EngineSlotSnapshot> }` — claves = strings de `ENGINE_PROBE_IDS` |

---

## API pública del motor

`SystemHealthEngine#getGlobalStatus(options: { origin: string }): Promise<GlobalHealthStatus>`

`src/app/api/v1/system-health/route.ts`: obtiene `host` / `x-forwarded-proto` vía `headers()` de `next/headers`, construye `origin`, llama `engine.getGlobalStatus({ origin })` con `EngineRegistry.use('system-health')`.
