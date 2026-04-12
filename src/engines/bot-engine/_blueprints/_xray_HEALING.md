# Plano — Resiliencia `bot-engine`

## UBICACIÓN LÓGICA

`FIFER://engines/bot-engine`

## Estrategia

- Errores de Prisma propagados a las rutas API / páginas; no hay circuit breaker interno en el motor.
- `getHealthStatus()` devuelve `ok: true` si el módulo está montado; fallos de DB se detectan en llamadas reales.
