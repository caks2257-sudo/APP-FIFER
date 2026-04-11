# Espejo X-Ray — resiliencia (`system-health/index.ts`)

En `index.ts` no hay clase “circuit breaker” ni cola de reintentos; solo **timeouts**, **clasificación de pulse** y **sondas opcionales de API key**.

---

## Timeout de red

- Todas las peticiones en `timedFetch` / `timedFetchJson` usan `AbortController` con `setTimeout(..., PING_TIMEOUT_MS)` donde `PING_TIMEOUT_MS === 2000`.
- Tras aborto o error de red: `ok: false`, `status: 0`, `latencyMs` medido, `error` con mensaje.

---

## Degradación por latencia

- `latencyTier`: si el pulse ya es `down` o `unknown`, no cambia; si `latencyMs > 500`, fuerza `degraded` (salvo los casos anteriores).

---

## OpenAI (status + key probe)

- Status page: indicador `none` → `up`; `minor` → `degraded`; `major` / `critical` → `down`; inválido → `unknown`; luego `latencyTier`.
- Si `OPENAI_API_KEY` está definida: segunda petición autenticada a `/v1/models?limit=1`.  
  - `401` o `403`: `invalidKey: true`, `pulse` → `down`, nota ampliada.  
  - Otro 4xx sin ser auth: pulse puede pasar a `degraded` vía `latencyTier`.

---

## Google / Gemini (discovery + key probe)

- Discovery sin key: éxito HTTP → `up`, fallo → `down`, luego `latencyTier`.
- Con clave (`process.env.GEMINI_API_KEY` \| `GOOGLE_AI_API_KEY` \| `GOOGLE_GENERATIVE_AI_API_KEY`, ver `probeGoogleStatus` en `index.ts`): si 401/403 → `invalidKey` + `down`.

---

## Rutas internas

- `probeInternalRoute`: éxito solo si `res.ok` y status en \[200,300). Sin reintentos.

---

## EngineRegistry

- No ejecuta los motores; solo lee `isRegistered` / `isInService` para `ENGINE_PROBE_IDS`.  
- Motor registrado pero `enabled: false` → snapshot `degraded` con nota explícita.

---

## Errores de carga del módulo

- Registro en `try/catch` con `console.error`; fallos en `EngineRegistry.register` no relanzan.
