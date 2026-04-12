# Inmunidad — `dom-engine:form-generator`

## UBICACIÓN LÓGICA

`FIFER://SUB_ENGINE/dom-engine/form-generator`

## Resiliencia

- Validación Zod en la ruta API (`domExpedienteGenerateRequestSchema`); errores 422 con `issues` planos.
- Tipos de formulario no soportados: `generateFormDraft` lanza `Error` descriptivo → 500 con mensaje en API.
- Sin persistencia propia: no hay estado corruptible entre solicitudes.
