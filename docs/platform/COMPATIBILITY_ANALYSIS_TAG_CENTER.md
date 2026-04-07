# Compatibility analysis: TAG-CENTER, scoring, credits, App Marketing

## Scope

New database objects live only in schema `fifer_platform`. No alterations to existing application tables, views, or functions.

## Production impact

| Area | Change | Risk |
|------|--------|------|
| PostgreSQL | New schema `fifer_platform`, tables `tag_providers`, `tags`, optional `feature_flags` seed | Low; no FKs into legacy tables |
| Node services | New modules under `saas-fifer/modules/fifer-platform/` | None until imported by callers |
| RLS | Enabled on new tables; policies for `authenticated` | Service role unchanged (bypasses RLS) |
| Env | New optional `FEATURE_*` variables (default off) | No effect if unset |

## Rollback

1. Run `supabase/migrations/20260406120000_tag_center_schema_rollback.sql` (drops `fifer_platform`).
2. Remove or stop importing `saas-fifer/modules/fifer-platform/` from any integration points.

## Activation

1. Apply forward migration in a staging project first.
2. Set feature flags to `true` only for tenants or processes that should use the new paths.
3. Integrate repositories/engine calls from orchestrators incrementally; keep legacy JSONB fields (`ai_metadata`, etc.) as source of truth until cutover is validated.

## Environment (feature flags)

| Variable | Enables |
|----------|---------|
| `FEATURE_TAG_CENTER` | Supabase TAG-CENTER repository |
| `FEATURE_SCORING_ENGINE` | Declarative `score()` |
| `FEATURE_CREDIT_SIMULATOR` | `estimate()` credit aggregation |
| `FEATURE_APP_MARKETING` | App Marketing scaffold |

Use any truthy value: `1`, `true`, `yes`, `on` (case-insensitive).
