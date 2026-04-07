# Contract tests (Phase 2)

## Legacy endpoints (always run)

These assert that **existing** `fifer-landing` routes keep their contracts when new TAG-CENTER APIs are introduced elsewhere:

- `GET /api/tiktok/auth` — without `TIKTOK_CLIENT_KEY`, responds `500` and body contains `Missing TikTok client key`.
- `GET /tiktokILRHOJ6PtrpGd4bErLjYlXMNhrHRntEh.txt` — `200` and body starts with `tiktok-developers-site-verification=`.
- `GET /api/tiktok/callback` — without `code`, redirects with `status=missing_code` in `Location`.

Start the landing app locally, then:

```bash
cd "c:/Proyectos/APP FIFER/fifer-landing"
npm run dev
```

In another shell:

```bash
cd "c:/Proyectos/APP FIFER"
set FIFER_LANDING_URL=http://localhost:3000
node --test tests/contract/phase2_contract.test.mjs
```

## New `/api/v1` routes (optional)

When an implementation exists, set:

- `API_V1_BASE` — e.g. `https://your-gateway/api/v1`
- `FIFER_API_TEST_TOKEN` — Supabase JWT for authenticated tests

Unauthenticated list-tags should return `401` (or `404`/`503` if not mounted).

## OpenAPI

Specification: [docs/platform/openapi/fifer_tag_center_app_marketing_v1.yaml](../../docs/platform/openapi/fifer_tag_center_app_marketing_v1.yaml)
