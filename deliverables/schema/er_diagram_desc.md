# TAG-CENTER Phase 1 — Entity-relationship description

## Diagram (textual)

```
┌─────────────────┐       slug FK          ┌──────────────────┐
│   tag_types     │◄──────────────────────│      tags        │
│  PK id (uuid)   │                       │  PK id (uuid)    │
│  UK slug (text) │                       │  FK type → slug  │
└─────────────────┘                       │  metrics[] jsonb │
                                          │  virtues[] jsonb │
┌─────────────────┐                       │  limitations[]   │
│  tag_providers  │◄── provider_id (nullable)                  │
│  PK id          │                       │  cost_unit/value │
└────────┬────────┘                       │  version       │
         │                                 │  created_by/at │
         │                                 │  history[] jsonb│
         ▼                                 └────────┬─────────┘
┌─────────────────────┐                           │
│  provider_catalog   │                           │
│  FK provider_id     │                           │
└─────────────────────┘                           │
                                                  │
         ┌────────────────────────────────────────┼────────────────────────┐
         │                                        │                        │
         ▼                                        ▼                        ▼
┌─────────────────┐   ┌─────────────────┐   ┌──────────────────────┐
│  tag_metrics    │   │   tag_costs     │   │    tag_history       │
│  FK tag_id      │   │  FK tag_id      │   │  FK tag_id           │
│  metric_key UK  │   │  tiers / window │   │  version, payload    │
└─────────────────┘   └─────────────────┘   └──────────────────────┘

┌───────────────────────────┐
│    tag_associations       │
│  FK tag_id                │
│  entity_type (enum text)  │──────► polymorphic: product | campaign | engine
│  entity_id (text)         │
└───────────────────────────┘
```

## Cardinality

| Relationship | Cardinality |
|--------------|-------------|
| `tag_types.slug` → `tags.type` | 1 : N |
| `tag_providers` → `tags.provider_id` | 1 : N (optional) |
| `tags` → `tag_metrics` | 1 : N |
| `tags` → `tag_costs` | 1 : N |
| `tags` → `tag_history` | 1 : N |
| `tags` → `tag_associations` | 1 : N |
| `tag_providers` → `provider_catalog` | 1 : N |

## Design notes

- **`tags`**: Carries the strict contract (`metrics`, `virtues`, `limitations`, `history` as JSONB arrays/objects) for fast reads and backward compatibility with the existing repository.
- **`tag_metrics` / `tag_costs`**: Optional normalized projections for SQL analytics and billing windows (`effective_from` / `effective_to`).
- **`tag_history`**: Durable audit trail; `tags.history` JSONB can mirror the latest entries for convenience.
- **`tag_associations`**: Polymorphic links; `entity_id` is TEXT to support UUID or external string keys without casting pain across entity kinds.
- **`provider_catalog`**: SKU-level offerings and capability snapshots (`capabilities` JSONB) separate from abstract `tags`.
