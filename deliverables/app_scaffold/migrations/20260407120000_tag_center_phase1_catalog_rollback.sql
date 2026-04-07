-- Phase 1 TAG-CENTER catalog rollback: drops normalized tables and FK from tags.
-- Does NOT drop fifer_platform.tags or tag_providers (from prior migration).

ALTER TABLE IF EXISTS fifer_platform.tags DROP CONSTRAINT IF EXISTS fk_fifer_tags_tag_type_slug;

DROP TABLE IF EXISTS fifer_platform.provider_catalog CASCADE;
DROP TABLE IF EXISTS fifer_platform.tag_associations CASCADE;
DROP TABLE IF EXISTS fifer_platform.tag_history CASCADE;
DROP TABLE IF EXISTS fifer_platform.tag_costs CASCADE;
DROP TABLE IF EXISTS fifer_platform.tag_metrics CASCADE;
DROP TABLE IF EXISTS fifer_platform.tag_types CASCADE;

-- Optional: revert tag_providers column additions (commented — uncomment if needed)
-- ALTER TABLE fifer_platform.tag_providers DROP COLUMN IF EXISTS display_name;
-- ALTER TABLE fifer_platform.tag_providers DROP COLUMN IF EXISTS kind;
-- ALTER TABLE fifer_platform.tag_providers DROP COLUMN IF EXISTS updated_at;
