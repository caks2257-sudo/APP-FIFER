# 🎨 X-Ray UI local — Finance (motor / API raíz)

> **Ámbito:** Capa financiera asociada a `src/` (reportes, wallets vía API master consumida desde el landing).  
> **Chasis global:** [`_xray_v0_MASTER.md`](../_xray_v0_MASTER.md).

---

## Identidad visual propia

| Token | Uso |
|-------|-----|
| **Primario** | Verde confianza `#059669` (saldo positivo, OK) |
| **Secundario** | Oro / ámbar `#D97706` (ROI, alertas monetarias) |
| **Fondo** | Verde muy oscuro `#022C22` o slate `#0f172a` |
| **Negativo** | Rojo sobrio `#DC2626` (solo pérdidas / bloqueos) |

**Gradientes:** discretos `from-emerald-950 to-slate-950` en headers de sección financiera.

**Botones:** Primario esmeralda; secundario oro outline.

---

## Contrato de datos

- **Motor HTTP:** `src/server.js` solo pre-flight/boot. El servidor Express que expone `/api/v1/master/*` es **`src/api/http_server.js`** (`npm run api`): monta primero el webhook Stripe con **cuerpo RAW** y luego `express.json()` + `attachPublicMasterRoutes` (ver `src/api/routes/public/master.routes.js`, `stripe.routes.js`).
- **Consumo desde landing:** `GET /api/v1/master/finance/report`, `GET /ai-capabilities`, `POST /url-campaign`, etc. (cliente `fifer-landing/src/lib/fifer-api.ts`).
- **JIT en UI:** la lógica de hidratación por Box vive en **`fifer-landing`** (`FinanceSnapshotBox`, `ContentPipelineBox`); este repo expone los **endpoints y servicios** que esos clientes llaman (`finance_service.js`, orchestrator, etc.).
- Props Box v0 clásico (cuando aplique): `data` desde el padre; **no** hardcodear cifras en artefactos v0.

### Box `fifer-finance-snapshot` (JIT + aislamiento) — UI en landing

- **UI:** `fifer-landing/src/components/finance/FinanceSnapshotBox.tsx` — fetch JIT; prueba de fallo `?fifer_finance_fail=1` / `sessionStorage fifer_jit_finance_fail`.
- **Manifiesto:** `fifer-landing/.../boxManifests.ts` (`boxManifestFinance`).
- **Orquestador:** `FinanceDashboardBox.tsx`.

---

## 📂 Estructura y Árbol del Módulo

Árbol resumido del **motor Node/API** (relativo a `src/` en la raíz del monorepo):

```text
src/
├── server.js                    # Entrada HTTP
├── api/
│   ├── routes/public/           # master.routes.js, webhook.routes.js
│   ├── middlewares/             # auth_supabase, internal_auth
│   └── master/                  # orchestrator, pipelines, jobs
├── services/                    # finance_service, publish_service, ai/*, sales_simulation_core
├── modules/
│   ├── fifer-platform/          # campaigns, finance-bridge, creative-bot, tag-center
│   └── affiliates/              # adapters (Meli, Amazon, AliExpress, …)
├── system/                      # boot_sequence, discovery_worker, background_sales_worker, cron
├── config/                      # ai_engines, etc.
├── scripts/                     # CLI (simulate_sales, tests)
├── types/                       # fifer-box.ts (contrato TS compartido con landing)
└── utils/                       # response_builder, encryption, schema_mapper
```

### Inventario de piezas clave (no UI)

| Ruta | Rol |
|------|-----|
| `api/routes/public/master.routes.js` | Gateway master: campañas, finance/report, platform-ranking, affiliates, AI capabilities |
| `services/finance_service.js` | Ledger, ROI, ingresos semanales, ranking plataforma |
| `modules/fifer-platform/finance-bridge/finance_client.js` | Puente wallets / earnings |
| `modules/fifer-platform/campaigns/draftRepository.js` | Borradores campaña |
| `api/master/pipelines/url_campaign_pipeline.js` | Pipeline URL → campaña |
| `system/background_sales_worker.js` | Ventas simuladas DEMO |

### Rutas API expuestas (motor — resumen)

Prefijo típico **`/api/v1/master`** (montaje exacto en `server.js`). Ejemplos consumidos por el landing:

| Endpoint (relativo) | Datos / uso |
|---------------------|-------------|
| `GET .../finance/report` | Resumen wallet, ledger reciente, ROI campañas, ingresos semanales |
| `GET .../finance/platform-ranking` | Ranking `sale_commission` por plataforma (7 días) |
| `GET .../ai-capabilities` | Catálogo capacidades IA |
| `POST .../url-campaign` | Ingesta URL → borrador |
| `GET .../campaign-drafts` | Lista borradores usuario |
| `POST .../publish-draft` | Disparo publicación externa |

Listado completo y reglas de auth: código en `master.routes.js`.

---

## Slots específicos

| `targetSlot` | Área |
|--------------|------|
| `finance-stats` | Tarjetas saldo, ROI, ledger resumido |
| `slot-stats-grid` | KPIs financieros |
| `slot-main-content` | Tabla movimientos / detalle |

---

## Ghost Mode local

- Overlay con acento **oro o verde** según tono del mensaje (`themeOverrides.accent: #D97706` o `#059669`).
- Mensajes: “Saldo no disponible”, “Configura BYOK para ver costes reales”.

```json
{
  "accent": "#D97706",
  "primary": "#022C22",
  "surface": "#0f172a"
}
```

---

## Estado

- [ ] Actualizar al cambiar reglas de visualización financiera.
