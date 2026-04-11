<!--
  SNAPSHOT v0_pack — Comunicaciones internas (API Manager)
  Fuentes canónicas: src/lib/_blueprints/_xray_COMMS.md + docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md
  Generado: 2026-04-11
-->

# Espejo técnico — Comunicaciones internas (`src/lib` API manager)

## UBICACIÓN LÓGICA

`FIFER://ENGINE/API_MANAGER`

**Alcance:** Validación de `InternalApiKey`, resolución de llamadas internas App ↔ Engine según `docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md` y `prisma/schema.prisma` (`InternalApiKey`).  
**Clase de documento:** Espejo técnico; mantener alineado con `src/lib/api-manager.ts` y el modelo Prisma correspondiente.

## Reflejo de código (mantener sincronizado)

| Artefacto        | Ubicación / notas |
|------------------|-------------------|
| Implementación   | `src/lib/api-manager.ts` |
| Modelo llaves    | Prisma `InternalApiKey` (`ownerId`, `scope`, `targetAppOrEngine`) |

---

## Matriz de flujos (registro operativo)

La matriz autoritativa de orígenes y destinos vive en `docs/blueprints/_xray_INTERNAL_COMMUNICATIONS.md`. **Estado actual del repo (auditoría 2026-04-11):** varias filas siguen marcadas como *Plantilla* / *pendiente* — deben sustituirse por flujos reales alineados a filas `InternalApiKey` en base de datos.

### Convenciones mínimas

- Ninguna App invoca un Engine sin llave válida para el `ownerId` correcto.
- No documentar valores de `apiKey` en Markdown.
- Validar en el Engine destino con `validateInternalRequest` (u homólogo) según `src/lib/api-manager.ts`.
