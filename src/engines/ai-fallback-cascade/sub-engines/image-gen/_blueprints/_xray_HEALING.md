# Healing & resiliencia — Sub-Engine `image-gen`

## Cascada por tier (Regla 6 — FinOps)

### Tier `pro` (modelos premium + rescate)

1. **Primario — DALL-E 3 (Pro):** generación vía OpenAI Images API. Fallos típicos: 401, 402, 429, cuerpo vacío / sin `url`.
2. **Secundario — Stable Diffusion (rescate):** llamada a Stability SD3 si `STABILITY_API_KEY` está configurada. Si la clave falta o la petición falla, se acumula el motivo y se pasa al paso 3.
3. **Terciario — Error:** se devuelve `{ ok: false, code: 'IMAGEGEN_EXHAUSTED', reason: ... }` con el detalle agregado (no se escala a Midjourney ni a otros pagos no cableados).

### Tier `free` (o `tier` ausente / distinto de `pro`)

- **No se invoca DALL-E 3 ni Stability** (evita coste y credenciales premium).
- **Ruta única:** URL Pollinations (calidad baja, sin clave). Si el `prompt` es inválido (vacío), error inmediato `{ ok: false, code: 'IMAGEGEN_INVALID_PROMPT', ... }`.
- Alternativa explícita en producto: mostrar mensaje de “cuenta Pro requerida para modelos premium” si se desea bloquear incluso el fallback gratuito; el contrato del motor prioriza el fallback Pollinations para mantener UX sin coste.

## Rompecircuitos

- Timeouts: delegados al stack `fetch` del runtime (configuración global del despliegue).
- Reintentos: no automáticos en v1; un intento por escalón para prevenir burbujas de coste.
