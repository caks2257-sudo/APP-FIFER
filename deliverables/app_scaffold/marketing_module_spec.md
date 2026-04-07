# App Marketing module — specification (deliverables)

## Integration

- **App Afiliados:** read-only `getAffiliateAvailability()` from `saas-fifer/config` affiliate blocks (`affiliateBridge.js`).
- **Orchestration:** campaigns reference `scoring_profile_id` and TAG-CENTER; `fifer-content` consumes `RenderJobPayload`; Make.com receives `publish` jobs.
- **Flags:** `FEATURE_APP_MARKETING`, `TAG_CENTER_INGEST_ACTOR_ID` (ingest only).

## Module layout (canonical)

```
saas-fifer/modules/fifer-platform/app-marketing/
├── index.js
├── affiliateBridge.js
├── playLoader.js
├── contracts/internal-messages.schema.json
└── plays/templates/*.play.json
```

## Database

- `fifer_platform.app_marketing_campaigns`
- `fifer_platform.app_marketing_jobs`

See `deliverables/app_scaffold/migrations/` for idempotent SQL.

## Background jobs

See `deliverables/app_scaffold/background_jobs.md`.

## Internal API

See `deliverables/app_scaffold/api_contracts.json`.

## UI (spec)

See `docs/platform/app_marketing/UI_ROUTES.md`.
