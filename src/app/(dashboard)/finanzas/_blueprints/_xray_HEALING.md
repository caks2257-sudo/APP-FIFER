# Plano de Resiliencia — Finanzas

## Circuit Breaker

- **Threshold:** 3 fallos consecutivos antes de abrir el circuito.
- **Half-open:** reintento tras ventana de enfriamiento; la UI muestra estado degradado sin derrumbar el shell del dashboard.
- **Registro:** fallos de box vía `boxCircuitBreaker.recordFailure` en rutas de datos de widgets.
