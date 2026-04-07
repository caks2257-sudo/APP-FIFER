# Phase 0 — Analysis and non-invasive integration (TAG-CENTER & App Marketing)

## 1. Runtime and module surface (as observed in repo)

| Layer | Components | Notes |
|-------|------------|--------|
| **Ingestion** | `fifer-ingestor` (e.g. `mass_sync.js`, `sync_aliexpress.js`), `saas-fifer/scripts` (mirrors, `test_ali.js`, `sync_campaigns.js`, seller scripts) | Node + `@supabase/supabase-js`; CSV stream → batched `products` upsert. |
| **Content / AI** | `fifer-content/scripts` (`main_generator.js`, `main_orchestrator.js`, `services/*`) | Shared `shared/supabase.js`; Gemini, ElevenLabs, FFmpeg, Supabase Storage, Make.com. |
| **Landing / OAuth** | `fifer-landing` (Next.js App Router) | TikTok `api/tiktok/auth`, `api/tiktok/callback`; minimal server API footprint in tree. |
| **Core service** | `saas-fifer/ecosystem/core-service` (FastAPI) | Auth sync to **SQLAlchemy `core.users`**, voice routes patching **`public.profiles`** via Supabase REST. |
| **Platform kit** | `saas-fifer/modules/fifer-platform` | TAG-CENTER repo, scoring, credits, App Marketing scaffold; **env-only** feature flags (no DB flag table in code). |
| **Adapters** | `saas-fifer/scripts/adapters/tagCenterAliexpressAdapter.js` | Optional sidecar after `products` upsert; requires `FEATURE_TAG_CENTER` + `TAG_CENTER_INGEST_ACTOR_ID`. |

**Supabase usage pattern:** almost all app data paths use **`public.products`**, **`public.campaigns`**, **`public.profiles`**. New work adds **`fifer_platform.*`** only.

**Internal vs public APIs:** “Public” user-facing HTTP in this repo is mostly Next routes + FastAPI under `/api/v1/core/*`. There is **no** dedicated REST API for TAG-CENTER in the repo yet—only scripts and modules callable from Node.

---

## 2. Existing feature flags (code)

| Env variable | Module behavior |
|--------------|-----------------|
| `FEATURE_TAG_CENTER` | `tagRepository`, AliExpress adapter sidecar |
| `FEATURE_SCORING_ENGINE` | `scoring/scoringEngine.js` |
| `FEATURE_CREDIT_SIMULATOR` | `credits/creditSimulator.js` |
| `FEATURE_APP_MARKETING` | `app-marketing/index.js` |
| `TAG_CENTER_INGEST_ACTOR_ID` | UUID for tag `created_by` when ingest sidecar runs (not a boolean flag) |

Defined in: `saas-fifer/modules/fifer-platform/featureFlags.js`.

---

## 3. Non-invasive integration plan

1. **Keep AliExpress → `public.products` contract frozen**  
   Do not add columns to upsert payloads unless product owners sign off. TAG-CENTER stays in **`fifer_platform.tags`** with **`extra.public_product_ref`** linking to `product_id` / `campaign_id`.

2. **Default-off flags in every environment**  
   Ship with all `FEATURE_*` unset or `false`. Enable per staging tenant or process only.

3. **Sidecar pattern (already applied for ingest)**  
   After successful `products` upsert, call `maybeSyncTagsAfterAliexpressBatch`. Failures log only; **never** throw into the CSV stream.

4. **App Marketing**  
   Keep **`planCampaignDraft`** and **`affiliateBridge`** read-only against `saas-fifer/config` until outbound webhooks and Make routers are specified. Do not attach to `publish_service` until payloads are versioned.

5. **Scoring / credits**  
   Use offline or admin scripts first; avoid inline scoring on the hot ingest path until latency budgets are known.

6. **Orchestration**  
   Do not merge TAG or marketing branches into `main_generator`’s critical path without a separate job queue or async hook; optional future: post-`ai_status=completed` hook to update tag metrics.

---

## 4. Orchestration bottlenecks and breaking-change vectors

| Area | Bottleneck / risk | Why it matters for new modules |
|------|-------------------|--------------------------------|
| **Ingest CSV stream** | Pause/resume per batch; sequential tag sidecar loop | Extra DB round-trips when `FEATURE_TAG_CENTER` is on increase wall time; mitigate with batch RPC later or async queue. |
| **main_generator** | Single pending row poll; Gemini quota / model fallback chain | Adding TAG scoring here could block or amplify quota usage. |
| **Make.com** | Single webhook URL; synchronous `axios.post` | App Marketing must not double-post or fork payloads without idempotency keys. |
| **RLS / keys** | Ingest uses service role; tags use same client | Consistent; authenticated-only tag paths in DB remain for future UI. |
| **Dual DB (core-service)** | `core.users` vs Supabase `profiles` | App Marketing must not assume one user store without an explicit sync story. |

**Breaking change if done wrong:** widening `products` upsert objects, changing `onConflict` keys, or blocking ingest on tag insert failure.

---

## 5. Prioritized inventory (JSON)

Machine-readable copy: [inventory.phase0.json](./inventory.phase0.json) (20 items, ranked).

---

## 6. Risk matrix (impact × probability)

| ID | Topic | Impact | Probability | Mitigation |
|----|--------|--------|-------------|------------|
| R1 | Tag sidecar slows large ingest | Medium | Medium | Flag off by default; batch/tag async job later |
| R2 | `fifer_platform` migration missing in env | High | Low | Staging apply first; adapter logs per-row errors |
| R3 | Accidental payload change on `products` upsert | High | Low | Code review; never add fields without approval |
| R4 | `TAG_CENTER_INGEST_ACTOR_ID` invalid | Low | Medium | One-time warning; skip tags |
| R5 | App Marketing double webhook with Make | High | Low | Feature off until idempotent design |
| R6 | Gemini quota exhaustion | High | Medium | Existing fallback chain; do not add scoring to same loop without budget |
| R7 | core-service / Supabase profile drift | Medium | Low | Document two stores; bridge in App Marketing only when modeled |

---

## 7. Rollback plan (mitigation and feature-flag locations)

### 7.1 Immediate runtime rollback (no DB migration revert)

1. Unset or set to false: `FEATURE_TAG_CENTER`, `FEATURE_APP_MARKETING`, `FEATURE_SCORING_ENGINE`, `FEATURE_CREDIT_SIMULATOR` in the process env for **saas-fifer**, **fifer-ingestor**, and any worker that imports `fifer-platform`.
2. **AliExpress path:** With `FEATURE_TAG_CENTER` off, `maybeSyncTagsAfterAliexpressBatch` returns immediately — ingest behavior matches pre-integration.  
   **Code location:** `saas-fifer/scripts/adapters/tagCenterAliexpressAdapter.js` (early `isEnabled('TAG_CENTER')` check).
3. **Repository layer:** `tagRepository` throws if `TAG_CENTER` flag off when called directly — avoid importing in hot paths without the flag.

### 7.2 Database rollback (after migration was applied)

1. Execute `supabase/migrations/20260406120000_tag_center_schema_rollback.sql` (drops schema `fifer_platform`) on a **staging** clone first.
2. Confirm no other feature depends on `fifer_platform.*`.
3. Production: maintenance window + backup snapshot before drop.

### 7.3 Feature-flag reference (file locations)

| Flag env | Definition | Consumers |
|----------|------------|-----------|
| `FEATURE_TAG_CENTER` | `saas-fifer/modules/fifer-platform/featureFlags.js` | `tag-center/tagRepository.js`, `scripts/adapters/tagCenterAliexpressAdapter.js` |
| `FEATURE_SCORING_ENGINE` | same | `scoring/scoringEngine.js` |
| `FEATURE_CREDIT_SIMULATOR` | same | `credits/creditSimulator.js` |
| `FEATURE_APP_MARKETING` | same | `app-marketing/index.js` |
| Example YAML | `saas-fifer/modules/fifer-platform/config/feature-flags.example.yaml` | Ops documentation |

### 7.4 Mitigation summary

- **Blast radius:** Flags default off; ingest sidecar is non-throwing.  
- **Data:** Legacy `products` rows and JSONB fields remain driven by existing scripts; TAG-CENTER is additive in `fifer_platform`.  
- **External:** Make and Gemini unchanged unless App Marketing or new hooks are explicitly wired.

---

## 8. Conclusion

TAG-CENTER and App Marketing can be integrated **without disrupting the AliExpress affiliate flow** if: (1) **`products` upserts stay byte-compatible**, (2) **flags stay default-off**, (3) **tag writes stay best-effort and out-of-band**, and (4) **App Marketing stays read-only** until outbound contracts are fixed. The highest coupling remains **`public.products`** and the **ingest / main_generator** orchestration; treat those as change-controlled surfaces.
