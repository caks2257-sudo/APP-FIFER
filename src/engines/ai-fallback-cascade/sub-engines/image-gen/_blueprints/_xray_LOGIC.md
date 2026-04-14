# Lógica y dependencias — Sub-Engine `image-gen`

## UBICACIÓN LÓGICA

FIFER://engines/ai-fallback-cascade/sub-engines/image-gen


**Estado:** Micro-Core aislado bajo `sub-engines/image-gen/`; carga por side-effect desde `ai-fallback-cascade/index.ts`.

## Proveedores externos (referencia Constitución v6.0 / Cap. 5)

### DALL-E 3 (OpenAI) — premium primario

- **Endpoint:** `POST https://api.openai.com/v1/images/generations`
- **Modelo:** `dall-e-3`
- **Parámetros:** `prompt`, `size` derivado de `aspectRatio`, `quality` (`standard` | `hd`), `n: 1`, `response_format: 'url'`
- **Autenticación:** cabecera `Authorization: Bearer ${OPENAI_API_KEY}`

### Midjourney

- **Integración:** sin API oficial estable expuesta al motor; las integraciones de terceros quedan **fuera del Micro-Core** hasta que exista contrato legal/técnico homologado. Documentado aquí solo como roadmap.

### Stable Diffusion (rescate premium)

- **Implementación actual:** Stability AI — `POST https://api.stability.ai/v2beta/stable-image/generate/sd3` (multipart: `prompt`, `output_format`, `aspect_ratio` alineado con la tabla del proveedor).
- **Autenticación:** `Authorization: Bearer ${STABILITY_API_KEY}`
- **Respuesta:** binario `image/png` → el motor expone `imageUrl` como Data URL base64.

### Pollinations (tier free — FinOps)

- **Patrón:** URL sintética `https://image.pollinations.ai/prompt/{encodeURIComponent(prompt)}` con query `width`, `height`, `nologo=true` (sin API key; calidad inferior, acorde a Regla 6).

## Dependencias internas

- `@/registry/engine-registry` — registro fractal `ai-fallback:image-gen`
- `@/types/user-dna` — `CoreProfile` para bifurcación `tier`
## CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)

- params
- error
- prompt
- trim
- reason
- aspectratio
- errors
- code
- height
- width
- catch
- imagegenparams
- push
- form

