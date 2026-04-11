# Plano HEALING — Inmunidad y circuit breaker (`fifer-contratos-main`)

## Dónde vive la lógica

- La página `page.tsx` solo compone layout + shell; la **inmunidad** y el manejo de errores de red están en **`ContratosPageShell`** (import directo desde la página, dentro del alcance que audita el inspector de obra).

## Circuit breaker de caja (`box-circuit-breaker`)

- Suscripción con `useSyncExternalStore` + `subscribeBoxCircuitSnapshots` para reflejar `boxCircuitBreaker.isCircuitOpen('fifer-contratos-main')`.
- Antes del fetch, si el circuito está abierto para **`fifer-contratos-main`**, el shell corta el flujo (error UI, sin datos).

## Registro de fallo (auditoría Constitución v6.0)

- En el bloque **`catch`** del `try` que envuelve el `fetch` de contratos, se invoca explícitamente:

  `boxCircuitBreaker.recordFailure('fifer-contratos-main')`

- En ese mismo `catch` también se llama `recordFailure()` del circuito Chicureo y se limpian filas / flags de degradado.

## Éxito y degradado controlado

- Respuestas degradadas pero parseables incrementan fallos vía `recordFailure()` cuando `payload.degraded` es verdadero; flujos exitosos llaman `recordSuccess()`.

## UI de prueba (dev)

- Panel «Dev — resiliencia (§0.25)» con botones para forzar estados de UI y reintentos que interactúan con los circuitos documentados arriba.
