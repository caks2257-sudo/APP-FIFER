# Idempotent migrations (copy of `supabase/migrations`)

| File | Purpose |
|------|---------|
| `20260406120000_tag_center_schema.sql` | Base `fifer_platform.tag_providers`, `fifer_platform.tags` |
| `20260406120000_tag_center_schema_rollback.sql` | Drop schema (destructive) |
| `20260407120000_tag_center_phase1_catalog.sql` | Phase 1 normalized tables + FK |
| `20260407120000_tag_center_phase1_catalog_rollback.sql` | Phase 1 rollback |
| `20260408100000_app_marketing_scaffold.sql` | App Marketing campaigns + jobs |
| `20260408100000_app_marketing_scaffold_rollback.sql` | App Marketing rollback |

**Source of truth:** repository root `supabase/migrations/`. Apply in timestamp order.
