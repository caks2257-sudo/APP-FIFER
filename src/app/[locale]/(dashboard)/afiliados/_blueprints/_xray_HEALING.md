# Plano de Resiliencia — Afiliados

## Circuit Breaker

- **Threshold:** 3 fallos consecutivos antes de abrir el circuito (patrón compartido con otras apps de caja FIFER v6.0).
- **Registro:** fallos de box vía `boxCircuitBreaker.recordFailure` en rutas de datos de widgets cuando apliquen shells de box.
- **Half-open:** reintento tras ventana de enfriamiento; degradación a mensaje de estado en UI sin colapsar el shell del dashboard.
