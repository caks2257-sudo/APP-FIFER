# Contrato X-Ray — Sub-Engine `image-gen` (`ai-fallback:image-gen`)

## UBICACIÓN LÓGICA

FIFER://engines/ai-fallback-cascade/sub-engines/image-gen


Micro-Core hijo del motor `ai-fallback-cascade`. No altera el contrato de insights de texto (`processInsight`).

## Entrada — `generate(params, core)`

| Campo | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `params.prompt` | `string` | Sí | Descripción en lenguaje natural de la imagen a generar. |
| `params.aspectRatio` | `string` | No | Relación de aspecto deseada (p. ej. `1:1`, `16:9`, `9:16`). Por defecto `1:1`. |
| `params.quality` | `'standard' \| 'hd' \| 'low'` | No | Calidad solicitada para el escalón premium (`standard` / `hd` en DALL-E 3). `low` se ignora en premium y orienta el modo gratuito (Pollinations). |
| `core` | `CoreProfile` | Sí | Perfil núcleo; `core.tier === 'pro'` habilita la cascada premium (DALL-E 3 → SD). Cualquier otro valor o ausencia de `tier` se trata como **free** (FinOps). |

## Salida — `Promise<ImageGenResult>`

Unión discriminada:

- **Éxito:** `{ ok: true, imageUrl: string, provider: 'openai-dalle-3' | 'stability-sd' | 'pollinations-free' }`
- **Error:** `{ ok: false, code: string, reason: string }`

`imageUrl` puede ser URL HTTPS pública o `data:image/png;base64,...` cuando el proveedor devuelve binario (rescate SD).

## Variables de entorno (premium / rescate)

- **DALL-E 3:** `OPENAI_API_KEY`
- **Stable Diffusion (API Stability):** `STABILITY_API_KEY` (rescate tras fallo DALL-E 3 en tier pro)

## Registro en runtime

Sub-motor registrado como **`ai-fallback:image-gen`**. Resolver con `EngineRegistry.use<ImageGenSubEngine>('ai-fallback:image-gen')`.
