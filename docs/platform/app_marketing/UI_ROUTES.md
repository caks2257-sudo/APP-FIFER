# UI endpoint routes — App Marketing (spec)

These routes are **additive** under `fifer-landing` (or a dedicated app). They do not replace existing `/api/tiktok/*` routes.

## Suggested Next.js App Router paths

| Route | Purpose |
|-------|---------|
| `/marketing` | Campaign list dashboard |
| `/marketing/campaigns/new` | Wizard: pick play template + objective |
| `/marketing/campaigns/[id]` | Detail: KPIs, A/B state, job queue |
| `/marketing/campaigns/[id]/creative` | Preview rendered assets |
| `/api/marketing/campaigns` | `GET` list / `POST` create (JWT + `app_marketing:write`) |
| `/api/marketing/campaigns/[id]` | `GET` / `PATCH` / `DELETE` |
| `/api/marketing/campaigns/[id]/rank` | `POST` trigger `rank_refresh` job |
| `/api/marketing/campaigns/[id]/estimate` | `POST` credit estimate (delegates to simulator) |

## Auth

- Supabase session JWT; RLS on `app_marketing_campaigns.owner_id = auth.uid()` when policies are enabled (service role for workers).

## Alignment with OpenAPI

Cross-reference Phase 2 spec `POST /api/v1/app-marketing/campaigns` — gateway may proxy `/api/marketing/*` to `/api/v1/app-marketing/*` for a single external contract.
