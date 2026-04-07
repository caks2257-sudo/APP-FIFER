# App Marketing — scaffold architecture (Phase 5)

## Role

Bridges **TAG-CENTER** (ranking), **credit simulator**, **App Afiliados** (`saas-fifer/config` affiliate blocks), and **FIFER orchestration** (`fifer-content` generators, Make.com publish). No hardcoded routing: campaigns reference **play templates** and **scoring profile ids**.

## Logical folder structure

```
saas-fifer/modules/fifer-platform/app-marketing/
├── index.js                 # planCampaignDraft, exports bridge + playLoader
├── affiliateBridge.js       # Read-only affiliate availability from config
├── playLoader.js            # Load JSON play templates by id
├── contracts/
│   └── internal-messages.schema.json
└── plays/
    └── templates/
        ├── sales_explosive_v1.play.json
        ├── high_commission_v1.play.json
        └── viral_growth_v1.play.json

docs/platform/app_marketing/
├── ARCHITECTURE.md            # this file
├── INTERNAL_API_CONTRACTS.md  # cross-app contracts
├── BACKGROUND_JOBS.md         # queue workers
├── UI_ROUTES.md               # landing UI surface (spec)
```

**Orchestration touchpoints**

| Layer | Responsibility |
|-------|------------------|
| `fifer-ingestor` / `saas-fifer/scripts` | Product feed → `public.products` + TAG-CENTER sidecar |
| `fifer-platform/scoring` | `rankProducts` using objective profile from play |
| `fifer-platform/credits` | `simulateScenario` for campaign budget |
| `fifer-content` | Executes `render` jobs (reels/carousel/post) |
| `publish_service` / Make | `publish` jobs outbound |
| `fifer-landing` | Campaign UI + optional API routes |

## Data flow (logical)

1. User picks **play template** + **objective** → creates row in `app_marketing_campaigns`.
2. **rank_refresh** job loads products, applies **scoring profile** from play → ordered list stored in `product_selection` JSONB snapshot.
3. **render** jobs enqueue per creative slot (format × variant).
4. **schedule** jobs set `run_at` for channel windows.
5. **publish** jobs fire Make/webhooks with affiliate-tracked URLs from `products`.

## Feature flag

`FEATURE_APP_MARKETING` gates module entrypoints; DB tables are safe when unused.
