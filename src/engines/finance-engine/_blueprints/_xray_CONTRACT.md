# Contrato — finance-engine (raíz)

## UBICACIÓN LÓGICA

FIFER://engines/finance-engine


Motor organizativo: delega contratos Zod y operaciones a sub-motores (`billing`, `payments`, `reconciliation`). La superficie pública consumida por rutas API valida payloads en cada sub-engine o en rutas `src/app/api/v1/finanzas/*` según el flujo.

- **Entrada/salida:** no expone un único contrato monolítico; ver `_xray_CONTRACT.md` de cada sub-engine bajo `sub-engines/`.
- **Registro:** `EngineRegistry` id `finance-engine` (ver `_xray_LOGIC.md`).
