# Lógica — `dom-engine:form-generator`

## UBICACIÓN LÓGICA

`FIFER://SUB_ENGINE/dom-engine/form-generator`

## Flujo

1. `generateFormDraft(formType, projectData)` en `mapper.ts` instancia la plantilla vacía (`createEmptyMinvu21Draft`) y fusiona campos conocidos del proyecto (rol avalúo, propietario, superficie terreno, destino, etc.).
2. Campos no enviados permanecen en `null` o `""` para que el arquitecto complete el JSON antes del trámite.
3. El motor no llama redes externas; solo ensambla datos.

## Dependencias

- Motor padre: `dom-engine` (registro en `src/engines/dom-engine/index.ts`).
- Sin dependencia de Bridge para el borrador base.
