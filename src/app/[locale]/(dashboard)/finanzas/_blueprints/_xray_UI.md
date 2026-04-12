# Plano Visual — Finanzas

## UBICACIÓN LÓGICA

`FIFER://APP/FINANZAS`

## Shell

- Contenedor de página: `src/app/(dashboard)/finanzas/page.tsx` dentro del layout `(dashboard)` (`max-w-7xl` en el padre).
- Fondo de sección: **Deep Navy** `#0A0F1E`; bloques y tablas con borde `#1E293B` y fondo `#0A0F1E` o `#111827` donde aplica.

## Box oficial `finance-liquidity-forecast`

| Campo | Valor |
|--------|--------|
| **boxId** | `finance-liquidity-forecast` |
| **Catálogo** | `src/registry/box-catalog.ts` (`BOX_CATALOG`), manifiesto `src/registry/fifer-box-catalog.ts` (`component: liquidity-forecast-box`) |
| **Renderer v0** | `src/components/v0-ingestion/registry.ts` → `FinanceLiquidityForecastBox` (`src/components/v0-ingestion/boxes/FinanceLiquidityForecastBox.tsx`) |
| **UI compartida** | `LiquidityForecastBox.tsx` + datos vía `useLiquidityForecast.ts` (validación Zod alineada al motor) |

### Estados de UI (SRE / Nevado Técnico)

1. **Skeleton (loading)** — `animate-pulse`, bloques `#1E293B`; no bloquea saldo ni lista (fetch acotado al hook del box).
2. **Graceful degradation** — `status: insufficient_data` desde API: mensaje del motor, contadores observados y requisitos (3 tx o 14 días de dispersión); sin error HTTP; copy en gris `#94A3B8` / `#64748B`.
3. **Ready** — métricas en tarjetas con `font-mono`; **Electric Yellow** `#EAB308` en título; alerta **ámbar** si `negativeProjectedNetFlow` o riesgo de saldo; **verde suave** si proyección favorable; aviso en rojo suave solo para saldo final bajo cero.
4. **Circuito abierto** — tras rachas de fallos, `boxCircuitBreaker` (`finance-liquidity-forecast`): tarjeta sustituida por aviso de aislamiento (borde `red-500/35`, texto `#F87171`); el resto del Hub (balance, transacciones, insight) sigue operativo.

### Blindaje

- **ErrorBoundary:** `BoxErrorBoundary` anidado solo alrededor de `LiquidityForecastBox` en `page.tsx` además del boundary de página: errores de render en el pronóstico no derriban balance ni lista.
- **Rompecircuitos:** `src/utils/box-circuit-breaker.ts` registra `finance-liquidity-forecast`; `useLiquidityForecast` llama `recordFailure` en fallos de red, HTTP no OK (excepto el flujo 401 sin circuito forzado) y validación Zod fallida.

## Componentes (resumen)

| Archivo | Rol |
|---------|-----|
| `BalanceCard.tsx` | Etiqueta «Saldo actual» y monto (`text-[#F9FAFB]`, `font-mono`); moneda en `#64748B`. |
| `LiquidityForecastBox.tsx` | Box de pronóstico 30 días; estados arriba; paleta Nevado Técnico. |
| `FinanceLiquidityForecastBox.tsx` | Shell de catálogo (ingestion) que reutiliza el mismo hook + presentación. |
| `TransactionList.tsx` | Tabla de movimientos; chips `INGRESO` / `EGRESO` con acento amarillo donde aplica. |
| `NewTransactionModal.tsx` | Overlay y formulario; botón primario `#EAB308` / texto `#0A0F1E`. |
| `page.tsx` | Cabecera + grid balance + pronóstico (boundary anidado) + lista + `SmartInsightWidget`. |

## Paleta Nevado Técnico (aplicada)

- **Electric Yellow** `#EAB308`: títulos de sección del pronóstico, CTA «Registrar movimiento», focos.
- **Deep Navy** `#0A0F1E`: superficies de tarjeta.
- Texto principal `#F9FAFB`, secundario `#94A3B8` / `#64748B`.
- Sin amarillo de fondo en bloques enteros; contraste sobrio, alineado al ADN visual Const. §0.
