# Contrato — `dom-engine:form-generator`

## UBICACIÓN LÓGICA

`FIFER://SUB_ENGINE/dom-engine/form-generator`

**targetAppOrEngine:** `dom-engine:form-generator`

## Entrada / salida

- **Entrada HTTP:** `DomExpedienteGenerateRequest` (`formType`, `projectData`) — `src/types/schemas.ts` (`domExpedienteGenerateRequestSchema`).
- **Salida HTTP:** `{ schemaVersion, capturedAt, draft }` donde `draft` es `MinvuForm21Draft` (`templates/minvu_2_1_edificacion.ts`).
- **API:** `POST /api/v1/dom/expedientes/generate` (autenticación Supabase + usuario Prisma).

## Tipos de formulario

| `formType` | Plantilla |
|------------|-----------|
| `minvu-2.1-edificacion` | Formulario 2.1 — solicitud de permiso de edificación (estructura referencial MINVU / práctica municipal Chile) |
