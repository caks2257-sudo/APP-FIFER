# 🎨 X-Ray UI local — fifer-landing (Next.js / Dashboard / Afiliados)

> **App:** `fifer-landing` — landing pública, Command Center, rutas `/campaigns`, `/affiliates`, `/finance`, `/settings`.  
> **Chasis global:** [`_xray_v0_MASTER.md`](../_xray_v0_MASTER.md) (raíz del monorepo).

---

## Identidad visual propia

| Token | Uso |
|-------|-----|
| **Base** | Deep Navy `#0A0F1E`, zinc `#18181B` / `#09090B` |
| **Marca** | Golden Yellow `#EAB308` (`fifer-yellow`) — CTAs primarios, activo en sidebar |
| **Acento frío** | Electric Blue `#2563EB` — enlaces, badges informativos |
| **Gradientes permitidos** | Solo sutiles: `from-fifer-navy to-zinc-950`, sin arcoíris; hero puede usar malla/grid tenue |

**Botones:** Primario sólido `bg-fifer-yellow text-black rounded-lg`; secundario `border border-zinc-600 bg-zinc-900 hover:border-fifer-yellow/50`.

### Cerrojo Cursor (`.cursorrules` §0.35)

- UI de esta app: **solo Tailwind** en `className` e iconos **Lucide**; **prohibido** CSS Modules / styled-components / CSS nuevo para producto (salvo mantenimiento de `globals.css`).
- Tras cambios de **rutas**, **API** o **esquemas** tocados aquí, actualizar **este** X-Ray local antes de cerrar la tarea.
- **Boxes** siempre alineados a **`BoxLoader`**, **`BoxProps`** e **`IFiferBoxManifest`** (catálogo + `v0-ingestion/registry`).

---

## Contrato de datos (browser)

- **API remota (motor):** `NEXT_PUBLIC_FIFER_API_BASE_URL` → `/api/v1/master/*` (`src/lib/fifer-api.ts`).
- **Suscripción / tier PRO (UI):** `GET /api/v1/master/user/subscription` (`fetchUserSubscription`) devuelve `subscription_tier` y flags BYOK; el creador de campañas en **`src/app/(dashboard)/campaigns/page.tsx`** lista voces/modelos (`ai_capabilities.requires_pro`) con badge PRO y modal si el plan free no tiene BYOK.
- **Capa de resiliencia:** `src/utils/adapters/` — Zod por fuente (Shopify, MercadoLibre, Google Ads, motores IA alineados a `engine-manifest` / `EngineItem`), **`toFiferBoxData(raw, module, { boxId })`**, bridge en `src/lib/fifer-box-data-bridge.ts`. Fallo Zod crítico → `meta.ghostMode` → `useFiferData` + `DiscoveryBox` (sin pantalla en blanco).
- **Sesión:** Supabase (`createFiferBrowserClient`) → `Authorization` en requests.
- **Props Box (v0 clásico):** `data`, `config`, `isLocked`, `isRefining` según MASTER / Protocolo Shell.
- **Admin (protegido `fifer_auth` / opcional `fifer_admin`):** `/admin/ai-health` (salud IA económica), `/admin/telemetry` (AI Command Center), Meta-Sync y telemetría vía `src/app/api/ai/*` y `src/app/api/admin/*`.

### Hidratación JIT (Command Center)

| `boxId` | Componente JIT | Datos |
|---------|------------------|--------|
| `fifer-finance-snapshot` | `FinanceSnapshotBox.tsx` | `fetchFinanceReport()` |
| `fifer-content-pipeline` | `ContentPipelineBox.tsx` | `fetchAiCapabilities()` |
| `fifer-ingestor-feed` | `IngestorFeedBox.tsx` | `fetchCampaignDrafts()` + `reloadNonce` tras reintento |

Errores de fetch JIT: `throw` en render → `BoxErrorBoundary` + `retryable` + `onRetry` / `errorBoundaryResetKey` en el orquestador (`*DashboardBox.tsx`).

---

## 📂 Estructura y Árbol del Módulo

Árbol resumido (archivos clave; rutas relativas a `fifer-landing/`):

```text
fifer-landing/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # Shell panel: dashboard, campaigns, finance, affiliates, settings
│   │   ├── (marketing)/          # Landing pública, legal, auth success
│   │   └── api/tiktok/           # OAuth TikTok (auth + callback)
│   ├── components/
│   │   ├── core/                 # BoxLoader, BoxErrorBoundary, box-loader/*, manifests/
│   │   ├── dashboard/            # AppShell, slots, manifiestos, *DashboardBox, ranking/sparkline
│   │   ├── content/              # ContentPipelineBox (JIT)
│   │   ├── ingestor/             # IngestorFeedBox (JIT)
│   │   ├── finance/              # FinanceSnapshotBox (JIT)
│   │   ├── campaigns/            # Historial borradores
│   │   ├── v0-ingestion/         # Punto de pegado v0
│   │   └── ui/                   # button, card, badge
│   ├── lib/                      # fifer-api.ts, supabase.ts, oauth
│   └── types/                    # re-export IFiferBoxManifest
├── package.json
├── tailwind.config.ts
└── _xray_v0_local.md             # (este archivo)
```

### Inventario de Componentes Internos

| Ruta (bajo `src/components/`) | Rol |
|-------------------------------|-----|
| `core/BoxLoader.tsx` | Orquestador de slot: permisos, BYOK, skeleton/error, `BoxErrorBoundary` por hoja |
| `core/BoxErrorBoundary.tsx` | Cortafuegos render; fallbacks Ghost / skeleton / error |
| `dashboard/DashboardBoxSlots.tsx` | Grid 12 cols del Command Center; compone Content / Ingestor / Finance |
| `dashboard/*DashboardBox.tsx` | Client: `BoxLoader` + `errorBoundaryResetKey` / `onRetry` para JIT |
| `dashboard/boxManifests.ts` | `IFiferBoxManifest` exportados (Content, Ingestor, Finance) |
| `finance/FinanceSnapshotBox.tsx` | Box JIT finanzas (`fetchFinanceReport`) |
| `content/ContentPipelineBox.tsx` | Box JIT capacidades IA (`fetchAiCapabilities`) |
| `ingestor/IngestorFeedBox.tsx` | Box JIT pipeline ingestión (`fetchCampaignDrafts`, ámbar/esmeralda) |
| `dashboard/AppShell.tsx` / `AppSidebar.tsx` / `AppHeader.tsx` | Navegación panel |
| `dashboard/PlatformRankingCard.tsx` | Ranking plataformas (ledger) |
| `dashboard/WeeklyIncomeSparkline.tsx` | Mini ingresos semanales |
| `dashboard/DemoSaleToastHost.tsx` | Toasts venta demo (polling ledger) |
| `campaigns/CampaignDraftHistorySection.tsx` | Lista borradores publicados |

### Rutas API locales (Next App Router)

Solo rutas definidas en **este** repo Next (no el motor `src/` de la raíz):

| Ruta | Archivo | Propósito |
|------|---------|-----------|
| `GET/POST` según implementación | `src/app/api/tiktok/auth/route.ts` | Inicio OAuth TikTok |
| `GET` (callback) | `src/app/api/tiktok/callback/route.ts` | Callback OAuth TikTok |
| `GET` | `src/app/tiktok*.txt/route.ts` | Verificación dominio TikTok (archivo estático) |

El resto de datos del panel salen del **API master** (`/api/v1/master/*`) vía `fifer-api.ts`.

---

## Slots específicos de esta app

| `targetSlot` | Área UI |
|--------------|---------|
| `slot-hero` | Landing hero / bienvenida dashboard |
| `slot-stats-grid` | KPIs campañas / resumen |
| `slot-main-content` | Formularios campaña, tablas |
| `slot-sidebar-nav` | Navegación lateral AppShell |
| `affiliate-feed` | Vitrina afiliados / JIT cards |

Legacy: `dashboard_top` para boxes existentes.

---

## Ghost Mode local

- Overlay coherente con marca: título bloqueo en **`var(--fifer-box-accent, #EAB308)`** si el manifiesto define `themeOverrides.accent`.
- Fondo overlay: `bg-zinc-950/70` + blur; contenido detrás en grayscale.

**`themeOverrides` sugerido (landing):**

```json
{
  "accent": "#EAB308",
  "primary": "#0A0F1E",
  "surface": "#18181B"
}
```

---

## Box `fifer-finance-snapshot` (JIT + aislamiento)

- **Componente:** `src/components/finance/FinanceSnapshotBox.tsx` — hidratación **JIT** con `fetchFinanceReport()` local (sin props masivas del layout).
- **Orquestación:** `src/components/dashboard/FinanceDashboardBox.tsx` — `BoxLoader` + `errorBoundaryResetKey` / `onRetry` para remontar el árbol tras fallo.
- **Manifiesto:** `boxManifestFinance` en `src/components/dashboard/boxManifests.ts` — `fallbackStrategy: "skeleton"`, `retryable: true`; errores de render los atrapa `BoxErrorBoundary` sin tumbar el grid.
- **Prueba de fallo (dev):** `?fifer_finance_fail=1` en la URL del dashboard, o `sessionStorage.setItem("fifer_jit_finance_fail","1")` + recarga. Quitar el flag para vuelta al flujo normal.

---

## Box `fifer-content-pipeline` (JIT + aislamiento)

- **Componente:** `src/components/content/ContentPipelineBox.tsx` — JIT con `fetchAiCapabilities()`; en fallo lanza `Error("JIT Fetch failed for ContentBox")` para `BoxErrorBoundary`.
- **Orquestación:** `src/components/dashboard/ContentDashboardBox.tsx` — `errorBoundaryResetKey` / `onRetry` (mismo patrón que Finance).
- **Manifiesto:** `boxManifestContent` — `fallbackStrategy: "skeleton"`, `retryable: true`.
- **Prueba de fallo (dev):** `?fifer_content_fail=1` o `sessionStorage.setItem("fifer_jit_content_fail","1")` + recarga.

---

## Box `fifer-ingestor-feed` (JIT + aislamiento + reintento)

- **Componente:** `src/components/ingestor/IngestorFeedBox.tsx` — JIT con `fetchCampaignDrafts()`; `reloadNonce` sincronizado con `errorBoundaryResetKey` del orquestador para **re-fetch al pulsar Reintentar** sin recargar la página.
- **Orquestación:** `src/components/dashboard/IngestorDashboardBox.tsx`.
- **Manifiesto:** `boxManifestIngestor` — `fallbackStrategy: "skeleton"`, `retryable: true`, `themeOverrides.accent` ámbar `#F59E0B`.
- **Prueba de fallo (dev):** `?fifer_ingestor_fail=1` o `sessionStorage.setItem("fifer_jit_ingestor_fail","1")` + recarga.

---

## Estado

- [ ] Sincronizar tras cada cambio visual o de slots en esta app.

---
*Auditoría X-Ray · Última sincronización: 2026-04-08*
