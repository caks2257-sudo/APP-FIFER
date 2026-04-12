# Healing — system-engine (raíz)

- El motor raíz no implementa cascadas propias; la resiliencia vive en sub-engines (p. ej. `system-engine:env-manager` — solo desarrollo, validación de entorno).
- Errores de registro en carga: log en consola sin tumbar el proceso (ver `index.ts` del sub-engine).
