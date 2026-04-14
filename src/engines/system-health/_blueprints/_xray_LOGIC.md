# Espejo X-Ray — lógica (`system-health/index.ts`)

## UBICACIÓN LÓGICA

FIFER://engines/system-health


**Archivo único de implementación:** `index.ts`. Registro: `EngineRegistry.register("system-health", new SystemHealthEngine())`.

---

## Constantes

| Símbolo | Valor |
|---------|--------|
| `ENGINE_ID` | `"system-health"` |
| `PING_TIMEOUT_MS` | `2000` |
| `OPENAI_STATUS_URL` | `https://status.openai.com/api/v2/status.json` |
| `GOOGLE_GENAI_DISCOVERY_URL` | `https://generativelanguage.googleapis.com/$discovery/rest?version=v1` |
| `ENGINE_PROBE_IDS` | `["ai-fallback", "ai-fallback:image-gen", "ai-fallback:comms"]` |

---

## Funciones internas

| Función | Rol |
|---------|-----|
| `timedFetch` | `fetch` con `AbortController` + timeout `PING_TIMEOUT_MS`; `cache: "no-store"`; devuelve `ok`, `status`, `latencyMs`, `error?`. |
| `timedFetchJson` | Igual timeout; además `res.json()` (catch → `null` en error). |
| `latencyTier` | Si `pulse` es `down` o `unknown` → sin cambio; si `latencyMs > 500` → `degraded`; si no, `pulse` original. |
| `probeOpenAiStatus` | `timedFetchJson` al status público; parsea `data.status.indicator` ∈ `none` \| `minor` \| `major` \| `critical` (otro → `unknown`); mapea a pulse; aplica `latencyTier`; si existe `OPENAI_API_KEY`, segunda sonda `GET https://api.openai.com/v1/models?limit=1` con Bearer → 401/403 fuerza `invalidKey` y `pulse: down`. |
| `probeGoogleStatus` | `timedFetch` al discovery URL; si OK → `up`; opcional sonda con clave (`GEMINI_API_KEY` \| `GOOGLE_AI_API_KEY` \| `GOOGLE_GENERATIVE_AI_API_KEY`) a `v1/models?key=...` → 401/403 igual que OpenAI. |
| `probeInternalRoute` | `GET` con `Accept: application/json`; éxito = `ok` y status 2xx; nota incluye label + HTTP + latencia. |
| `buildEngineSnapshots` | Por cada id en `ENGINE_PROBE_IDS`: `EngineRegistry.isRegistered` / `isInService`; pulse `up` \| `degraded` \| `down` y `loadHint` `loaded` \| `not-mounted`. |

---

## Clase pública

`SystemHealthEngine`

- `readonly id = ENGINE_ID`
- `getGlobalStatus(options: { origin: string })`:
  - Normaliza `origin` (quita `/` final).
  - `Promise.all([ probeOpenAiStatus(), probeGoogleStatus(), probeInternalRoute(\`${origin}/api/v1/misbots\`, ...), probeInternalRoute(\`${origin}/api/v1/contratos\`, ...) ])`.
  - `engines = buildEngineSnapshots()`.
  - Retorna objeto con `schemaVersion: "1.0-system-health"`, `capturedAt: ISO string`, `external`, `internal`, `engines`.

---

## Sonda arquitectónica (`architecture-probe.ts`)

| Símbolo | Rol |
|---------|-----|
| `runArchitectureProbe` | Lectura **no destructiva** con `fs/promises` + `path`: `.cursorrules` (versión ADN `vX.Y` en las dos primeras líneas), `docs/registry/LOCATION_MAP.json` (conteo de anclas), `docs/blueprints/AUTO_HEALING_COMPLIANCE.md` (`stat`: tamaño y `mtime`). |
| `ARCHITECTURE_HEALTH_SCHEMA_VERSION` | `"1.0-architecture-health"`. |
| `readMode` | `filesystem` si al menos un archivo se leyó desde `process.cwd()`; si no (p. ej. Vercel sin repo), `bundle` con `reason` en español — **no lanza** al caller. |

**APIs:** `GET /api/v1/system-health/architecture` (admin) devuelve el snapshot; `GET /api/v1/war-room` lo inyecta como `architectureHealth` (§17).

---

## Dependencias

- `@/registry/engine-registry` — solo lectura de registro para `buildEngineSnapshots`.
- `fetch` global del runtime del servidor para red externa e interna.

No hay Zod ni Prisma en este motor.

## CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)

- latencyms
- pulse
- status
- error
- note
- engines
- trim
- process
- keyprobe
- promise
- catch
- path
- unknown
- aiproviderpulse
