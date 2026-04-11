# Plano de Resiliencia - dashboard

## Circuit Breaker

- Los widgets del orquestador delegan en shells y hooks de box que llaman `boxCircuitBreaker.recordFailure` ante fallos de red/parseo (patrón §0.25 Const. v6.0).
- **Threshold:** coherente con el catálogo global de circuitos (típ. 3 fallos consecutivos antes de abrir).
