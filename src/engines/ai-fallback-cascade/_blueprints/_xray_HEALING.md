# Espejo X-Ray — resiliencia (`ai-fallback-cascade/index.ts`)

**Archivo:** `index.ts`. Motor registrado como `"ai-fallback"` (`AiFallbackCascadeEngine`). Side-effect: importa `./sub-engines/image-gen` y `./sub-engines/comms` (registro de sub-engines).

---

## Error terminal agotado

- Clase `AiCascadeExhaustedError extends Error`: `code = "AI_CASCADE_EXHAUSTED"`, propiedad `tierErrors: ReadonlyArray<CascadeTierFailure>`.
- `CascadeTierFailure`: `{ tier: number; provider: string; detail: string }`.
- Se lanza al **agotar** la cascada del tier correspondiente, o en `processInsight` si el error no es ya `AiCascadeExhaustedError` (se envuelve en otro `AiCascadeExhaustedError` con mensaje genérico y mismo `tierErrors` acumulado hasta ese punto).

---

## Logging de fallos por proveedor

- `logCascadeFailure(provider, detail)` → `console.error` con prefijo `[FIFER Engine ai-fallback-cascade]`.

---

## Tier free (`cascadeFreeTier`)

Orden de intentos (cada fallo acumula en `tierErrors`):

1. **Gemini** (`geminiDualStage`): requiere `geminiApiKey()`; si no hay env, empuja error de configuración sin llamar API.
2. **OpenAI** (`openaiDualStage` con modelo `gpt-4o-mini`): requiere `OPENAI_API_KEY`.

Si ambos caminos fallan o faltan claves → `AiCascadeExhaustedError` con mensaje explícito: no hay escalada a modelos premium en free.

Excepciones en `try/catch` por proveedor: mensaje capturado y añadido a `tierErrors`.

---

## Tier pro (`cascadeProTier`)

Orden:

1. **Anthropic** (`anthropicDualStage`) si `ANTHROPIC_API_KEY` — variable `tier` incrementa tras este bloque.
2. **OpenAI premium** (`openaiDualStage` con `resolveOpenAiPremiumModel()`) si `OPENAI_API_KEY`. Si no hay Anthropic ni OpenAI en el bloque premium, empuja error `none` / mensaje de sin claves.
3. **Rescate Gemini** (`geminiDualStage`) con clave Gemini.

Si todo falla → `AiCascadeExhaustedError` (mensaje tier pro).

---

## Respuestas HTTP tratadas (OpenAI chat)

- `openaiChat`: `401` → razón credenciales; `402` / `429` → saldo/límite; otras → texto crudo o status; respuesta sin `choices[0].message.content` → fallo.

No hay reintentos automáticos por status; un fallo hace pasar al siguiente eslabón en la cascada (mismo tier).

---

## Variables de entorno relevantes

| Uso | Env |
|-----|-----|
| Gemini | `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` |
| Modelo Gemini | `FIFER_GEMINI_MODEL` (default `gemini-1.5-flash`) |
| OpenAI | `OPENAI_API_KEY`; modelo premium `FIFER_OPENAI_FALLBACK_MODEL`, `FIFER_OPENAI_MODEL` o default `gpt-4o` |
| Anthropic | `ANTHROPIC_API_KEY`; modelo `FIFER_ANTHROPIC_MODEL` o default `claude-3-5-sonnet-20241022` |

---

## Ausencias en `index.ts` (lectura del archivo)

- No hay cola de reintentos por proveedor, backoff, estado de circuit breaker persistente ni envío a métricas externas: solo cascada secuencial y acumulación de `tierErrors`.
