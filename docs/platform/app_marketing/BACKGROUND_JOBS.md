# Background jobs — App Marketing

Jobs are stored in `fifer_platform.app_marketing_jobs` (see migration `20260408100000_app_marketing_scaffold.sql`). Workers MUST be idempotent: use `job.id` as dedupe key.

## Job types

| job_type | Purpose | Typical producer | Consumer |
|----------|---------|------------------|----------|
| `rank_refresh` | Recompute ranked products from TAG-CENTER + scoring profile | Scheduler / campaign activate | Node worker calling `rankProducts` |
| `render` | Produce creatives via `fifer-content` pipelines | Campaign builder | `fifer-content` scripts or queue runner |
| `schedule` | Set `run_at` for channel slots | Campaign planner | Cron / Edge scheduler |
| `publish` | Dispatch to Make / social APIs | Post-render | `publish_service` |
| `ab_evaluate` | Pull metrics, pick winner | Daily cron | Analytics worker |
| `credit_reconcile` | Compare estimated vs actual credits | Hourly | Billing adapter |

## Lifecycle

1. Insert row `status=pending`, `run_at=now()` or future.
2. Worker claims: `UPDATE ... SET status=running, started_at=now() WHERE id=? AND status=pending` (or use `FOR UPDATE SKIP LOCKED`).
3. On success: `status=completed`, `finished_at=now()`.
4. On failure: `status=failed`, `error=text`, optional retry with new row.

## Rendering pipeline (logical)

- **Input:** `RenderJobPayload` (see INTERNAL_API_CONTRACTS.md).
- **Output:** URLs stored in campaign `meta.rendered` or `products.ai_*` fields (existing tables only — no regression).

## Scheduling

- **schedule** jobs carry `payload.window` (timezone, start/end hour, days_of_week).
- Materialize concrete `publish` jobs with `run_at` in UTC.

## Failure policy

- Exponential backoff for `render` / `publish` (fragile external APIs).
- Max attempts stored in `payload.attempt` or separate retry table (future).
