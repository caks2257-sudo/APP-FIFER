# Zero-Regression Checklist (mandatory before finalizing any phase)

Use this checklist for **every** platform change (TAG-CENTER, scoring, credits, App Marketing, migrations, new routes). Cross-check against concrete artifacts in-repo.

**Architecture directive v2.8:** **Multi-Store Universal Connectors** (`src/modules/affiliates/adapters/`) + normalización FIFER JSON; credenciales solo `.env` y X-Ray (`extract:shopify-api`, `extract:meli-api`, `checks.shopify_api_env`). Legacy: ingest AliExpress + `FEATURE_AUTO_PROCESS` / `bridge_hook` sin cambios de flujo CSV.

---

## 1. Impact radius

**Goal:** Name every **existing** surface that could change behavior if the phase ships wrong.

| Category | Inventory (maintain as code evolves) |
|----------|--------------------------------------|
| **HTTP (landing)** | `GET /api/tiktok/auth`, `GET /api/tiktok/callback`, verification TXT route — see `fifer-landing/src/app/api/` |
| **HTTP (system monitor API)** | `GET /api/v1/system/health` — Command Center health (Supabase `fifer_platform` + Make webhook); gated by `FEATURE_SYSTEM_MONITOR`; optional `SYSTEM_MONITOR_API_KEY` (Bearer / `X-System-Monitor-Key`). Ruta: `src/api/routes/system.routes.js` (motor Express en `src/` cuando está levantado). UI del monitor y BFF: **`fifer-landing`** (Next.js, `src/app/`). |
| **HTTP (Master — v2.7–v2.9)** | `POST /api/v1/master/automated-play` — `X-FIFER-INTERNAL-KEY` (ISC/bots). `POST /api/v1/master/orchestrate` — **JWT Supabase** (`Authorization: Bearer`) vía `auth_supabase.requireSupabaseJwt`; `user_id` inyectado en `metadata`. Rutas: `src/api/routes/public/master.routes.js` (Express `src/`). Frontend productivo: **`fifer-landing/src/app/`** (App Router). |
| **Multi-tienda (APIs oficiales)** | `BaseAffiliateAdapter` (`getProduct`, `getPrice`, `checkStock`), `ShopifyAdapter` (v1 mock + REST opcional). Registro v2.8: `extraction_nodes` **`shopify-api`**, **`meli-api`**, `woocommerce`. X-Ray: `extract:*` + **`shopify_api_env`** (`SHOPIFY_API_KEY` + `SHOPIFY_STORE_URL` si `FEATURE_SHOPIFY_CONNECTOR`). **Bridge:** `triggerMasterFromUniversalProducts` acepta filas AliExpress (`campaign_id`) o adaptadores (`source_store` / `external_id`). **Scraping AliExpress intacto.** |
| **Feeder bridge (ingest)** | `fifer-ingestor/scripts/sellers/sync_aliexpress.js`, `saas-fifer/scripts/sellers/sync_aliexpress.js` — tras upsert OK: **Final Bridge** con `FEATURE_AUTO_PROCESS=true` → `triggerMasterAfterProductUpsert` (`bridge_hook`, fire-and-forget). Legacy: `FEATURE_INGEST_MASTER_BRIDGE` → `ingest_product_bridge` (mismo ISC). Fallos Master **no** detienen el CSV sync. |
| **Auth (JWT-ready)** | `src/api/middlewares/auth_supabase.js` — `optionalSupabaseJwt` / `requireSupabaseJwt` for Next/user routes; not yet wired to all public routes by default. |
| **HTTP (vascular layer / master)** | `POST /api/v1/master/orchestrate` (planned wrapper over `src/api/master/master_orchestrator.js`) with `X-FIFER-INTERNAL-KEY` on ISC hops; service discovery via `src/config/service_nodes.json`. Keep off until route wrapper is deployed. |
| **Master jobs (async)** | In-memory registry `src/api/master/jobs/job_store.js` — used for deferred pipelines (`submitDeferredFullCircle`, `runPipelineWithAsyncPolicy`); poll via `getJobEnvelope` / `getPipelineJobStatus`. Not durable across restarts until backed by Redis/DB. |
| **Pipelines** | `src/api/master/pipelines/sales_content_pipeline.js` — Tag-Center graceful degradation (`DEFAULT_STRATEGY`); financial pre-flight unchanged; marketing remains critical path; post-success `dispatchMakeWebhook` (`src/services/publish_service.js`, axios, fire-and-forget via `setImmediate`). AliExpress CSV/transformación intacta; solo sidecars opcionales post-upsert (`TAG_CENTER`, Final Bridge). |
| **Safe Boot (v2.6–v2.7)** | `src/system/boot_sequence.js` — env integrity + `health_xray` + **Paso C** Final Bridge (`probeMasterBridgeReadiness` si `FEATURE_AUTO_PROCESS=true`: `healthz` con `MASTER_API_BASE_URL` o modo in-process; fallo → solo warning). `CRITICAL_BOOT_ERROR` solo en env/vascular. Pre-flight raíz: `node src/server.js` (p. ej. vía `npm run dev:safe`). Escapes: `FEATURE_DRY_RUN=true`, `SAFE_BOOT_SKIP=true`. Runner: `npm run boot:check`. |
| **HTTP (future API)** | `/api/v1/tag-center/*`, `/api/v1/app-marketing/*` — `docs/platform/openapi/fifer_tag_center_app_marketing_v1.yaml` |
| **Supabase `public`** | `products`, `campaigns`, `profiles` — ingest + `fifer-content` scripts |
| **Supabase `fifer_platform`** | `tags`, `tag_types`, `tag_metrics`, `tag_costs`, `tag_history`, `tag_associations`, `provider_catalog`, `app_marketing_campaigns`, `app_marketing_jobs` — migrations under `supabase/migrations/` |
| **External** | Make.com webhook (`MAKE_WEBHOOK_URL`, optional `FEATURE_AUTO_PUBLISH`) — `src/services/publish_service.js` + `fifer-content` legacy paths |

**Pre-merge question:** Does this diff touch any row above? If yes, document **why** it stays backward-compatible or gate it.

---

## 2. Gating

**Feature flags (env):**

| Variable | When ON |
|----------|---------|
| `FEATURE_TAG_CENTER` | `tagRepository`, AliExpress `tagCenterAliexpressAdapter` sidecar |
| `FEATURE_SCORING_ENGINE` | `scoringEngine.score` / `rankProducts` |
| `FEATURE_CREDIT_SIMULATOR` | `creditSimulator.estimate` / `simulateScenario` |
| `FEATURE_APP_MARKETING` | `planCampaignDraft`, play templates |
| `FEATURE_SYSTEM_MONITOR` | `GET /api/v1/system/health` + `SystemStatus` UI (objetivo: **`fifer-landing` Next**); does not touch ingest |
| `FEATURE_AFFILIATES_BROKER` | Enables affiliates heartbeat/proxy node in vascular discovery (`src/config/service_nodes.json`) |
| `FEATURE_AUTO_PUBLISH` | Must be exactly `true` (string) with `MAKE_WEBHOOK_URL` set — `axios.post` to Make from `dispatchMakeWebhook` (`src/services/publish_service.js`) |
| `FEATURE_DRY_RUN` | `true` or payload `dry_run: true` — pipeline skips `callTagCenter` / `callMarketing`, uses `src/system/mocks/ai_responses.js`; response metadata includes `simulated: true`; Make `fifer_metadata.is_simulation` via env and/o `metadata.is_simulation`. **Prod:** `FEATURE_DRY_RUN=false`. No AliExpress ingest changes. |
| `FEATURE_INGEST_MASTER_BRIDGE` | `true` — after each successful AliExpress `products` upsert batch, triggers Master via `ingest_product_bridge` → `bridge_hook.invokeMasterAutomatedPlay`. **Default off**. |
| `FEATURE_AUTO_PROCESS` | `true` — **Final Bridge**: tras upsert OK, `scheduleAutoProcessAfterUpsert` → `triggerMasterAfterProductUpsert` (mismo ISC). **Default off**; no debe bloquear el sync si el Master falla. |
| `TAG_CENTER_INGEST_ACTOR_ID` | UUID for `created_by` on ingest tag writes (not a boolean flag) |

**Code pointers (toggle points):**

- Definition: `saas-fifer/modules/fifer-platform/featureFlags.js` (`FLAGS`, `isEnabled`).
- TAG ingest sidecar: `saas-fifer/scripts/adapters/tagCenterAliexpressAdapter.js` — early return if `!isEnabled('TAG_CENTER')`.
- Repository guard: `saas-fifer/modules/fifer-platform/tag-center/tagRepository.js` — `assertFlag()` on CRUD.
- Scoring / credits / marketing: respective modules call `isEnabled` before work.
- Ops template: `saas-fifer/modules/fifer-platform/config/feature-flags.example.yaml`.

**Policy:** New paths default **off** in production until the checklist is satisfied.

---

## 3. Safety

**Idempotent migrations**

- Forward scripts: `supabase/migrations/*.sql` — use `IF NOT EXISTS`, `ON CONFLICT DO UPDATE/NOTHING` where applicable.
- One **rollback** companion per phase when schema is additive: `*_rollback.sql`.

**Database backup (before prod apply)**

1. Supabase: **Project Settings → Database** — manual backup or provider snapshot (e.g. PITR if enabled).
2. `pg_dump` (if self-hosted Postgres):  
   `pg_dump $DATABASE_URL -Fc -f backup_fifer_$(date +%Y%m%d).dump`
3. Record **migration filename + timestamp** in the deploy ticket.

**Policy:** Apply to **staging** first; run smoke queries on `public.products` and critical paths.

---

## 4. Integrity (contract tests)

**Runner:** `npm run test:contract` → `tests/contract/phase2_contract.test.mjs`.

**Assertions (existing landing must not break):**

| Case | Assertion |
|------|-----------|
| TikTok auth (no client key) | Status `500`, body contains `Missing TikTok client key` (or `307` if keys set in env) |
| TikTok verification file | Status `200`, body prefix `tiktok-developers-site-verification=` |
| TikTok callback (no `code`) | Redirect `307`, `Location` contains `status=missing_code` |

**Machine-readable spec:** `deliverables/api/contract_tests.json`, CI: `.github/workflows/contract-tests.yml` / `deliverables/ci/tests_contract.yml`.

**Policy:** PRs touching `fifer-landing`, `tests/contract`, or `fifer-platform` run contract tests.

---

## 5. Rollback

**Canary / percent rollout**

1. Deploy code with **all `FEATURE_*` unset/false**.
2. Enable flags for **internal** or **single tenant** only.
3. Ramp: ~1–5% → 10% → 25% → 50% → 100% with error/latency/credit gates (see `docs/platform/governance.md` §6).

**Runtime rollback (instant)**

```bash
# Unset or set false in the worker / edge env
FEATURE_TAG_CENTER=
FEATURE_SCORING_ENGINE=
FEATURE_CREDIT_SIMULATOR=
FEATURE_APP_MARKETING=
FEATURE_SYSTEM_MONITOR=
```

**Database rollback (ordered — reverse of apply)**

Use `deliverables/governance/rollback_scripts.sql` or individual files:

- `supabase/migrations/20260408100000_app_marketing_scaffold_rollback.sql`
- `supabase/migrations/20260407120000_tag_center_phase1_catalog_rollback.sql`
- `supabase/migrations/20260406120000_tag_center_schema_rollback.sql` (drops entire `fifer_platform` — last resort)

**Precondition:** Flags off and no code path depending on dropped objects.

**Detail:** `deliverables/analysis/rollback_plan.md`, `docs/platform/governance.md` §10.

---

## 6. Observability

**Credit overspend**

| Metric / signal | Alert |
|-----------------|-------|
| Ratio actual vs estimated credits (rolling) | > 1.25 for 24h |
| Daily credit total vs 7d baseline | > 2× |
| `simulateScenario` / estimate error rate (`unknown_engine`, `unit_mismatch`) | > 1% of calls |

**Sudden tag mutations**

| Metric / signal | Alert |
|-----------------|-------|
| Tag update rate (`fifer_platform.tags` or `tag_history`) vs baseline | Spike |
| `history.changed_by` / `created_by` outside allow-list | Any in 15m |
| FK / constraint errors on `tags.type` | Any |

**Machine-readable:** `deliverables/governance/monitoring_alerts.json`.

**Policy:** Wire alerts to on-call; throttle ingest sidecar if tag spike correlates with deploy.

---

## Sign-off (per phase)

| Gate | Owner | ✓ |
|------|--------|---|
| Impact radius reviewed | | |
| Flags default-off / documented | | |
| Migrations idempotent + rollback path | | |
| Contract tests green | | |
| Rollback + canary documented | | |
| Alerts defined / ticketed for wiring | | |

---

*Related: `docs/platform/governance.md`, `deliverables/README.md`, `.cursorrules`.*
