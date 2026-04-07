# FIFER ecosystem — governance, versioning, testing, and rollout

This document defines **operational policies** for TAG-CENTER, App Marketing, scoring, credits, and related migrations. It complements `.cursorrules` and Phase 0–5 design artifacts under `docs/platform/`.

---

## 1. Change governance

| Principle | Rule |
|-----------|------|
| **No silent production change** | Any schema, default rate, or routing change requires a PR, rollback plan, and (for DB) idempotent migration + paired rollback script. |
| **Feature flags first** | New behavior ships **off** by default (`FEATURE_*` unset or false). Enable per environment after checklist. |
| **Compatibility** | Ingest and `public.products` payloads remain backward-compatible unless a signed migration plan explicitly lifts constraints. |
| **Ownership** | Platform modules live under `saas-fifer/modules/fifer-platform/`; migrations under `supabase/migrations/`. |

---

## 2. Tag versioning policy (TAG-CENTER)

| Rule | Detail |
|------|--------|
| **Row version** | `fifer_platform.tags.version` increments on every logical change; `history` JSONB appends an entry `{ at, by, action, patch \| snapshot, version }`. |
| **Semantic meaning** | Breaking changes to tag **meaning** (e.g. `type` or `name` rename) require **new** tag or explicit deprecation note in `description` + `extra.deprecated_since`. |
| **Immutability** | Prefer **append-only** history; avoid destructive edits without audit. |
| **Uniqueness** | `(name, type)` unique; new versions of a concept should use a new `name` slug (e.g. `metric:price_midband_v2`) or coordinated migration. |
| **Tag types** | `tags.type` must reference `tag_types.slug` after Phase 1 migration; new types added via `tag_types` insert, never ad hoc strings in production. |

---

## 3. Audit logging standards

| Layer | What to log | Retention |
|-------|-------------|-----------|
| **TAG-CENTER** | `tag_history` table + `tags.history` mirror for quick reads | ≥ 400 days (tune per compliance) |
| **App Marketing** | `app_marketing_jobs` state transitions; campaign `meta.audit[]` for human decisions | Same |
| **API (future)** | Request id, actor id, route, `FEATURE_*` snapshot, error code | Central log store |
| **Credit / scoring** | Optional `meta` on estimates for calibration reviews | 90 days operational |

**Abnormal tag modification** (see §8): alerts when batch updates exceed thresholds or when `created_by` ≠ service actor for ingest automation.

---

## 4. Schema migration strategy

1. **Forward scripts** are **idempotent** where possible (`IF NOT EXISTS`, `IF NOT EXISTS` constraints, seed `ON CONFLICT`).
2. **One rollback file per phase** in `supabase/migrations/`, named `*_rollback.sql`, applied manually in **reverse order** of deployment.

| Rollback script | Drops / reverts |
|-----------------|-----------------|
| `20260408100000_app_marketing_scaffold_rollback.sql` | `app_marketing_jobs`, `app_marketing_campaigns` |
| `20260407120000_tag_center_phase1_catalog_rollback.sql` | Phase 1 tables + FK on `tags` |
| `20260406120000_tag_center_schema_rollback.sql` | Entire `fifer_platform` schema (destructive) |

3. **Staging first**: apply forward migrations on a staging Supabase project; run smoke tests + test matrix (§9).
4. **Feature flags**: DB can exist while app code paths remain off; enables **canary** without exposing UI.

---

## 5. Feature-flag gating (reference)

| Variable | Module |
|----------|--------|
| `FEATURE_TAG_CENTER` | `tagRepository`, AliExpress tag sidecar |
| `FEATURE_SCORING_ENGINE` | `scoringEngine.score` / `rankProducts` |
| `FEATURE_CREDIT_SIMULATOR` | `creditSimulator.estimate` / `simulateScenario` |
| `FEATURE_APP_MARKETING` | `app-marketing` plans and templates |
| `TAG_CENTER_INGEST_ACTOR_ID` | UUID for ingest tag writes |

**Policy:** Production enables flags only after pre-deploy assertions pass for that module.

---

## 6. Deployment rollout plan

### 6.1 Stages

1. **Dev** — all flags on for developers; migrations applied freely with rollback rehearsal.
2. **Staging** — parity with prod secrets subset; contract tests + test matrix required.
3. **Production** — flags off; enable via canary.

### 6.2 Canary / percent-based release

| Step | Action |
|------|--------|
| 1 | Deploy **code** with flags **off** (no user-visible change). |
| 2 | Enable **internal service** or single tenant: set `FEATURE_*=true` for a dedicated process only (e.g. worker namespace). |
| 3 | **Canary 1–5%** traffic: route only tagged requests (header or tenant id) to new paths / workers. |
| 4 | **Ramp 10% → 25% → 50% → 100%** over agreed windows; rollback = flip flag + drain queues. |
| 5 | **Percent-based** at edge: use gateway weights (e.g. 90% legacy / 10% new API) for HTTP; for batch jobs, process every Nth job with new stack. |

**Criteria to advance:** error rate ≤ baseline, p95 latency within SLO, no credit overspend alerts (§8), no spike in tag audit alerts.

---

## 7. CI contract test suites

| Suite | Command | Purpose |
|-------|---------|---------|
| **Contract (landing)** | `npm run test:contract` (repo root) | Legacy TikTok/verification routes unchanged; optional new API when `API_V1_BASE` set. |
| **Location** | `tests/contract/phase2_contract.test.mjs` | See `tests/contract/README.md`. |

**CI policy**

- Run on every PR touching `fifer-landing`, `tests/contract/`, or `saas-fifer/modules/fifer-platform/`.
- **Pre-deploy:** contract tests green; migration SQL reviewed; rollback file present for new migration.
- **Optional:** spin ephemeral Next server for non-skipped legacy tests (or accept skip when `ECONNREFUSED`).

**GitHub Actions:** `.github/workflows/contract-tests.yml` runs `npm run test:contract`.

---

## 8. Monitoring and alerting

### 8.1 Credit overspend

| Metric | Description | Alert |
|--------|-------------|-------|
| `credits_estimated_vs_actual_ratio` | Rolling sum(actual)/sum(estimated) per day | **> 1.25** for 24h |
| `credits_daily_total` | Sum of billed credits | **> 7d baseline × 2** |
| `simulateScenario_errors` | Count of `unit_mismatch` / `unknown_engine` | **> 1%** of calls |

**Sources:** application logs, `credit_reconcile` jobs (App Marketing), billing export if available.

### 8.2 Abnormal tag modifications

| Signal | Alert |
|--------|-------|
| **Batch size** | > N updates/min to `fifer_platform.tags` (N from baseline) |
| **Actor drift** | `created_by` or `history.by` not in allow-list for automation |
| **Type FK violations** | DB constraint errors on `tags.type` |
| **Version jumps** | Single tag `version` increment > K in 1 hour without ticket id in `meta` |

**Mitigation:** throttle ingest sidecar; require `TAG_CENTER_INGEST_ACTOR_ID`; page on-call for destructive rollback.

---

## 9. Minimal test matrix (pre-deploy / post-deploy)

| # | Assertion | Pre-deploy | Post-deploy |
|---|-----------|------------|-------------|
| 1 | `npm run test:contract` exits 0 (or agreed skip) | ✓ | ✓ |
| 2 | Forward migrations apply cleanly on staging clone | ✓ | ✓ (prod after cutover) |
| 3 | `FEATURE_TAG_CENTER` off → AliExpress ingest completes without tag errors | ✓ | ✓ |
| 4 | `FEATURE_TAG_CENTER` on + valid `TAG_CENTER_INGEST_ACTOR_ID` → tags rows appear | ✓ staging | ✓ canary |
| 5 | `public.products` row shape unchanged for ingest upsert (no accidental columns) | ✓ | ✓ |
| 6 | Rollback script dry-run on disposable DB (optional) | ✓ | — |
| 7 | Scoring `sales_explosive` profile returns score in [0,100] with `explain.factors` | ✓ | ✓ smoke |
| 8 | Credit simulator totals match spot-check spreadsheet for one scenario | ✓ | ✓ weekly |

---

## 10. SQL rollback inventory (authoritative paths)

Apply **reverse order** of original deployment (newest feature first).

```
supabase/migrations/20260408100000_app_marketing_scaffold_rollback.sql
supabase/migrations/20260407120000_tag_center_phase1_catalog_rollback.sql
supabase/migrations/20260406120000_tag_center_schema_rollback.sql   # drops entire fifer_platform — last resort
```

**Warning:** Rolling back Phase 0/1 while code still references `fifer_platform` will cause runtime failures; coordinate flag-off first.

---

## 11. Review cadence

| Cadence | Activity |
|---------|----------|
| Monthly | Review calibration CSV vs vendor invoices (credits). |
| Quarterly | Review tag type catalog and deprecations. |
| Per major release | Re-run test matrix; update OpenAPI if API changed. |

---

## Document history

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-04-06 | Phase 6 initial governance |
