# Contrato — system-engine:env-manager

## UBICACIÓN LÓGICA

`FIFER://engines/system-engine/sub-engines/env-manager`

**targetAppOrEngine:** `system-engine:env-manager`

## Entrada / salida

| Función | Condición | Comportamiento |
|--------|-----------|----------------|
| `readEnvFile()` | `NODE_ENV === 'development'` | Devuelve string UTF-8 del `.env` en `process.cwd()` |
| `writeEnvFile(content)` | `NODE_ENV === 'development'` | Persiste el string completo |
| Cualquier llamada | `NODE_ENV !== 'development'` | `throw Error` determinista |

No expone secretos por HTTP; uso previsto: scripts locales y futuras herramientas admin acotadas.
