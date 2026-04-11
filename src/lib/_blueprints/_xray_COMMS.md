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
