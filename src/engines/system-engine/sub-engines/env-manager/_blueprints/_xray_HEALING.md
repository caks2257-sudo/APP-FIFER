# Healing — system-engine:env-manager

## UBICACIÓN LÓGICA

`FIFER://engines/system-engine/sub-engines/env-manager`

**targetAppOrEngine:** `system-engine:env-manager`

- Fallos de I/O en `readFile`/`writeFile` propagan al caller; no hay retry automático.
- Fuera de desarrollo, error explícito antes de tocar disco (fail-closed).
