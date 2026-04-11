# X-Ray DNA — Control de Contratos (ADN Central)

App desplegada bajo **§0.15**, **§0.25**, **BaseBoxTemplate** / **ContratosBox** y catálogo **fifer-contratos-main**.

---

## Identidad

| Clave | Valor |
|-------|--------|
| **boxId** | `fifer-contratos-main` |
| **Módulo** | `finance` (bioma esmeralda `#10B981` / oro `#EAB308`) |
| **Ruta App** | `/contratos` (`src/app/(dashboard)/contratos/page.tsx`) |
| **Redirección** | `/dashboard/contratos` → `/contratos` |

---

## Navegación (Sidebar)

- Jerarquía **Finanzas** (acordeón): **Finanzas** (`/finanzas`) → **Control de Contratos** (`/contratos`).
- Archivo: `src/components/dashboard/Sidebar.tsx`.

---

## Dashboard (orquestación)

| Campo | Valor |
|--------|--------|
| **widget id** | `contratos-finance-slot` |
| **colSpan** | `12` (fila propia; evita solape con fila 4+8 y fila del `4` de contenido) |
| **API** | `GET /api/v1/dashboard` incluye el widget en el payload |

Sanidad: `applyLayoutSanityForCommander` + `useApplyCommanderLayoutSanity` usan **`DASHBOARD_REFERENCE_WIDGETS`** (`src/config/dashboardReferenceWidgets.ts`) con los 4 slots, alineado al payload canónico.

---

## Componentes

| Rol | Ruta |
|-----|------|
| Shell página | `src/components/dashboard/contratos/ContratosPageShell.tsx` |
| Box resiliente | `src/components/v0-ingestion/boxes/ContratosBox.tsx` (`BaseBoxTemplate`, tabla densa, grid 12) |
| Facade boxId | `src/components/v0-ingestion/boxes/FiferContratosMain.tsx` → `ContratosBox` |

---

## Schemas (Zod)

- **`src/schemas/schemas.ts`**: `ContratosDataSchema`, `contratosListPayloadSchema`, `contratoEstadoSchema`.
- Reexport legacy: `src/schemas/contratosBdui.ts`.

Campos fila: `id`, `localNombre`, `arrendatario`, `montoUF`, `vencimiento` (ISO), `estado` (`Vigente` \| `Por Vencer` \| `Alerta`).

---

## Bridge & degradación

- **`src/utils/fifer-box-data-bridge.ts`**: rutas `fiferContratosMain` / `contractsChicureoLocales`, `buildDegradedNormalized`, `routeContratosApiWithValidation`.
- **API datos**: `GET /api/v1/contracts/chicureo` (`?fail=1` → 500).

---

## Rompecircuitos

- **API**: `contracts-chicureo-api` — `src/utils/contracts-chicureo-circuit.ts`.
- **Box UI**: `fifer-contratos-main` — `boxCircuitBreaker.recordFailure('fifer-contratos-main')` en `ContratosBox` (parse inválido).

---

## Informes

- **Grid / Commander**: `FIFER_CORE/v0_sync_pack/99_SYNC_REPORT.md` (`npm run layout:sanity`).
- **Maestro**: `FIFER_CORE/v0_sync_pack/01_REPORT_MAESTRO.md`.

---

*Última revisión: cierre documental Paso 3 — enrutamiento Finanzas + slot dashboard 12 cols.*
