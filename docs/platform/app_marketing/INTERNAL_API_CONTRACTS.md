# Internal API contracts (App Marketing ↔ Afiliados ↔ orchestration)

These are **logical** contracts (not all HTTP-exposed). Prefer versioned JSON payloads.

## 1. `CampaignPlanRequest` → `CampaignPlanResponse`

**Producer:** UI or admin script. **Consumer:** `planCampaignDraft` (Node).

```json
{
  "id": "uuid-optional",
  "name": "string",
  "objective_key": "sales_explosive | high_commission | viral_growth | custom",
  "play_template_id": "sales_explosive_v1",
  "scoring_profile_id": "sales_explosive",
  "owner_id": "uuid"
}
```

**Response:**

```json
{
  "specId": "uuid | null",
  "affiliateNetworks": { "amazon": true, "impact": false },
  "notes": "string",
  "play": { "play_id": "...", "objective": "..." }
}
```

## 2. `RankProductsCommand` (orchestration → scoring)

**Consumer:** `fifer-platform/scoring` `rankProducts(profile, products)`.

```json
{
  "profile_id": "sales_explosive",
  "product_ids": ["optional-filter"],
  "limit": 50
}
```

**Response:** ordered list with `score`, `explain`, `rank` (see scoring engine).

## 3. `CreditEstimateRequest` (planning → credits)

**Consumer:** `simulateScenario(DEFAULT_RATES, lines, scenario)`.

```json
{
  "lines": [],
  "scenario": { "variation": {}, "parallel": {}, "retries": {}, "transcoding": {} }
}
```

## 4. `RenderJobPayload` (marketing jobs → fifer-content)

```json
{
  "campaign_id": "uuid",
  "product_id": "string",
  "format": "reel | carousel | post",
  "engine_overrides": {},
  "variant": "A | B",
  "deadline_at": "ISO8601"
}
```

## 5. `PublishJobPayload` (marketing → Make)

```json
{
  "campaign_id": "uuid",
  "channel": "tiktok | ig | ...",
  "creative_url": "https://...",
  "affiliate_url": "https://...",
  "tracking": { "utm": {} }
}
```

## 6. Affiliate bridge (read-only)

**Function:** `getAffiliateAvailability()` — never mutates `config`; returns booleans for network readiness.

Machine-readable schema: [../../../saas-fifer/modules/fifer-platform/app-marketing/contracts/internal-messages.schema.json](../../../saas-fifer/modules/fifer-platform/app-marketing/contracts/internal-messages.schema.json)
