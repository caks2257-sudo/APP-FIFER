# Contrato — external-bridge-engine

## UBICACIÓN LÓGICA

`FIFER://engines/external-bridge-engine`

**targetAppOrEngine:** `external-bridge-engine`

## Superficie pública (`ExternalBridgeEngineApi`)

| Método | Rol |
|--------|-----|
| `getHealthStatus()` | Observabilidad §6.4 |
| `buildProxy(vault?)` | `BridgeProxy` con `process.env` + overrides descifrados |
| `getPublicIntegrationStatuses(vault?)` | Lista MOCK/PROD por integración (sin secretos) |
| `getPaymentsAdapter` / `getBillingAdapter` / `getBankingAdapter` | Adaptadores Flow / Stripe / Fintoc |

## Variables de entorno reconocidas

| Variable | Integración |
|----------|-------------|
| `FLOW_API_KEY` | payments |
| `STRIPE_SECRET_KEY` | billing |
| `FINTOC_SECRET_KEY` | banking |

Marcador MOCK: vacío o `INSERT_KEY_HERE` (véase `isPlaceholderSecret` en paquete).
