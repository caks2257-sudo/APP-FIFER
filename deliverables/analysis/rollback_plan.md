# Rollback plan (FIFER platform modules)

## Runtime

1. Unset or set to false: `FEATURE_TAG_CENTER`, `FEATURE_APP_MARKETING`, `FEATURE_SCORING_ENGINE`, `FEATURE_CREDIT_SIMULATOR`.
2. AliExpress ingest: with `FEATURE_TAG_CENTER` off, `maybeSyncTagsAfterAliexpressBatch` is a no-op.
3. Tag repository: `tagRepository` throws if called without flag when `TAG_CENTER` off — avoid importing in hot paths without flags.

## Database (reverse order of deployment)

Execute scripts in `deliverables/governance/rollback_scripts.sql` (or individual files under `supabase/migrations/*_rollback.sql`):

1. App Marketing scaffold rollback
2. TAG-CENTER Phase 1 catalog rollback (drops FK + normalized tables)
3. TAG-CENTER schema rollback — **drops entire `fifer_platform`** (last resort)

**Precondition:** Disable app code paths that reference dropped objects; take backup.

## Files

| Script |
|--------|
| `supabase/migrations/20260408100000_app_marketing_scaffold_rollback.sql` |
| `supabase/migrations/20260407120000_tag_center_phase1_catalog_rollback.sql` |
| `supabase/migrations/20260406120000_tag_center_schema_rollback.sql` |
