# Contrato X-Ray — `ai-fallback-cascade`

## UBICACIÓN LÓGICA

FIFER://engines/ai-fallback-cascade


## Entrada

| Campo | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `prompt` | `string` | Sí | Texto del usuario / brief ya compuesto (p. ej. instrucción + ADN + contexto). |
| `core` | `CoreProfile` | Sí | Perfil núcleo del usuario; el campo opcional `tier` gobierna la cascada FinOps (ver abajo). |
| `options` | `ProcessInsightOptions` \| `any` | No | Configuración opcional. |
| `options.meta` | `{ moduleId: string; boxId: string }` | No | Metadatos de trazabilidad; se añaden al refinado de la etapa 1. |

### Comportamiento FinOps (Regla 6 — Capítulo 5, Constitución v6.0)

- Si `tier === 'free'` (o `tier` ausente / distinto de `'pro'`): **cascada estricta en modelos gratuitos** (p. ej. Gemini Flash, `gpt-4o-mini`). No se invocan Claude 3.5 Sonnet ni `gpt-4o`. Si el intento en modelos gratuitos falla, se lanza `AiCascadeExhaustedError` sin escalada a premium.
- Si `tier === 'pro'`: se **inicia en modelos premium** (p. ej. Claude 3.5 Sonnet; respaldo premium `gpt-4o`) y los modelos gratuitos se usan **solo como rescate** final (p. ej. Gemini Flash).

## Salida exitosa

`Promise<{ finalOutput: string }>` — insight final en español (pipeline dual-stage por proveedor: refinado → análisis).

Los resultados parciales `{ ok, reason }` son solo tipos internos de cada llamada HTTP a proveedor; el método público **no** devuelve `ok: false` al llamador.

## Error tipado (cascada agotada)

Clase `AiCascadeExhaustedError` (extiende `Error`):

- `code`: literal `"AI_CASCADE_EXHAUSTED"`.
- `message`: resumen legible para operador / API.
- `tierErrors`: lista de `{ tier, provider, detail }` con el historial de fallos por nivel.

La capa HTTP debe capturar esta excepción y devolver JSON estructurado (p. ej. `503` con `code` y `tierErrors`).

## Variables de entorno relevantes

- **Gemini (rescate pro / primario free):** `GEMINI_API_KEY` o `GOOGLE_AI_API_KEY` o `GOOGLE_GENERATIVE_AI_API_KEY`; modelo opcional `FIFER_GEMINI_MODEL` (por defecto `gemini-1.5-flash`).
- **Claude (premium primario en tier pro):** `ANTHROPIC_API_KEY`; modelo opcional `FIFER_ANTHROPIC_MODEL` (por defecto `claude-3-5-sonnet-20241022`).
- **OpenAI premium (`gpt-4o`) y mini (`gpt-4o-mini`):** `OPENAI_API_KEY`; modelos opcionales `FIFER_OPENAI_FALLBACK_MODEL` / `FIFER_OPENAI_MODEL` para el escalón premium (por defecto `gpt-4o`); rescate económico fijo **`gpt-4o-mini`** en flujo free.

## Registro en runtime

Motor registrado en `EngineRegistry` como **`ai-fallback`**. Resolver con `EngineRegistry.use<AiFallbackCascadeEngine>('ai-fallback')`.
