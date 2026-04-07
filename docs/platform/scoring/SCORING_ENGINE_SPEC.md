# Declarative scoring engine — specification (v1)

## Purpose

Rank or score products using a **declarative profile** (`ScoringProfile`): a list of **factors**, each with a **positive weight** `w_i`. Every factor produces a **normalized** value `norm_i ∈ [0, 1]`. The final score is a **strict 0–100** value with a full **explainability** object listing each factor’s contribution.

## Mathematical normalization (0–100)

Let `W = sum_i w_i`. For each factor `i`:

- `share_i = w_i / W`
- `contrib_i = share_i × norm_i × 100`

**Aggregate (before clamp):**

`S_raw = sum_i contrib_i`

Because `norm_i ∈ [0, 1]` and `sum_i share_i = 1`, `S_raw ∈ [0, 100]`.

**Final score:**

`score = clamp( round_half_up(S_raw, 3), 0, 100 )`

- `round_half_up` to **3 decimal places** avoids float noise while staying in 0–100.
- **Clamp** handles rare floating edge cases.

### Per-factor normalization

- **Path factors:** `norm = linear_map(raw, min, max)` into `[0,1]`, optional `invert`.
- **tagOverlap:** `norm = (hits on required tag set) / |required|`.
- **tagWeightCoverage:** given `tag_weights` map `T → ℝ⁺`,  
  `norm = (sum of weights for tags present on product) / (sum of all weights in map)`.  
  If the map is empty, `norm = 0`.

## Explainability object (required shape)

Each run returns:

- `explain.profileId`, `explain.objective`, `explain.normalization` (method + formula + `W`)
- `explain.factors[]`: for each factor: `id`, `weight`, `weightShare`, `raw`, `normalized`, `contribution`, optional `detail`
- `explain.sum_before_clamp`, `explain.score_final` (mirror of top-level `score`)

## Tie-breaker rules (ranking)

When **two products have the same rounded `score`**:

1. Compare **contribution** of the **primary factor** (default: `tie_break.primary_factor_id`, else first factor in `factors[]`). Higher wins.
2. If still tied: compare **`product_id`** lexicographically (`product_id_asc` default, or `product_id_desc` if configured).

Implemented in `rankProducts()` in `scoringEngine.js`.

## Objective profiles

Examples of `profile.id` / `objective`:

| Objective | Intent |
|-----------|--------|
| `sales_explosive` | Weight tags and metrics tied to impulse, discount, velocity |
| `high_commission` | Emphasize `metrics.commission_rate`, affiliate fit tags |
| `viral_reach` | Emphasize engagement, viral tags, platform reach |

Expressed as JSON DSL: see `scoring-dsl-v1.schema.json` and `worked_examples.json`.

## Pseudocode

```
function score(profile, input):
  W = sum(f.weight for f in profile.factors)
  if W <= 0: return (0, explain_empty)

  acc = 0
  for each factor f in profile.factors:
      norm_i = evaluateFactor(f, input)   // path | tagOverlap | tagWeightCoverage | literal
      share_i = f.weight / W
      contrib_i = share_i * norm_i * 100
      acc += contrib_i
      record explain row (f.id, share_i, raw, norm_i, contrib_i)

  score = clamp(round_half_up(acc, 3), 0, 100)
  return (score, explain)

function rankProducts(profile, products):
  rows = [ score(profile, p) for each p in products ]
  sort rows by score desc, then primary factor contribution desc, then product_id asc
  return rows with rank index
```

## Files in repo

| File | Role |
|------|------|
| `saas-fifer/modules/fifer-platform/scoring/scoringEngine.js` | Node implementation (`score`, `rankProducts`) |
| `saas-fifer/modules/fifer-platform/scoring/scoring-dsl-v1.schema.json` | JSON Schema for profiles |
| `docs/platform/scoring/examples/worked_examples.json` | Five worked numeric examples |
