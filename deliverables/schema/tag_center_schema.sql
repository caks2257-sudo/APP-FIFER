-- FIFER platform: TAG-CENTER + provider registry (idempotent forward migration)
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards.

CREATE SCHEMA IF NOT EXISTS fifer_platform;

-- Optional provider registry for tag.provider_id
CREATE TABLE IF NOT EXISTS fifer_platform.tag_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tag_providers_slug_unique UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS fifer_platform.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    virtues JSONB NOT NULL DEFAULT '[]'::jsonb,
    limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
    cost_unit TEXT NOT NULL DEFAULT 'credit',
    cost_value NUMERIC(18, 6) NOT NULL DEFAULT 0,
    provider_id UUID REFERENCES fifer_platform.tag_providers (id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    extra JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT tags_name_type_unique UNIQUE (name, type)
);

CREATE INDEX IF NOT EXISTS idx_fifer_platform_tags_type ON fifer_platform.tags (type);
CREATE INDEX IF NOT EXISTS idx_fifer_platform_tags_provider ON fifer_platform.tags (provider_id);
CREATE INDEX IF NOT EXISTS idx_fifer_platform_tags_created_by ON fifer_platform.tags (created_by);

ALTER TABLE fifer_platform.tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'fifer_platform' AND tablename = 'tags' AND policyname = 'tags_select_own'
    ) THEN
        CREATE POLICY tags_select_own ON fifer_platform.tags
            FOR SELECT TO authenticated
            USING (created_by = auth.uid());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'fifer_platform' AND tablename = 'tags' AND policyname = 'tags_insert_own'
    ) THEN
        CREATE POLICY tags_insert_own ON fifer_platform.tags
            FOR INSERT TO authenticated
            WITH CHECK (created_by = auth.uid());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'fifer_platform' AND tablename = 'tags' AND policyname = 'tags_update_own'
    ) THEN
        CREATE POLICY tags_update_own ON fifer_platform.tags
            FOR UPDATE TO authenticated
            USING (created_by = auth.uid())
            WITH CHECK (created_by = auth.uid());
    END IF;
END $$;

ALTER TABLE fifer_platform.tag_providers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'fifer_platform' AND tablename = 'tag_providers' AND policyname = 'tag_providers_read_authenticated'
    ) THEN
        CREATE POLICY tag_providers_read_authenticated ON fifer_platform.tag_providers
            FOR SELECT TO authenticated
            USING (true);
    END IF;
END $$;

COMMENT ON TABLE fifer_platform.tags IS 'TAG-CENTER canonical tag rows; history is append-only JSON snapshots.';
COMMENT ON COLUMN fifer_platform.tags.metrics IS 'Array of metric objects (JSONB).';
COMMENT ON COLUMN fifer_platform.tags.history IS 'Append-only array of {at, by, patch, version}.';
-- Phase 1 — TAG-CENTER catalog (normalized model + indexes + FKs)
-- Requires schema fifer_platform and prior tag_providers/tags from 20260406120000,
-- or run on fresh DB after that migration.
-- Idempotent where possible: creates new objects with IF NOT EXISTS; adds constraints carefully.
--
-- Pre-check: every distinct fifer_platform.tags.type must exist in tag_types.slug after the seed
-- INSERT (or VALIDATE CONSTRAINT on fk_fifer_tags_tag_type_slug will fail).

CREATE SCHEMA IF NOT EXISTS fifer_platform;

-- ---------------------------------------------------------------------------
-- tag_types: controlled vocabulary for tags.type (referenced by tags.type)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fifer_platform.tag_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tag_types_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_fifer_platform_tag_types_active ON fifer_platform.tag_types (is_active, sort_order);

COMMENT ON TABLE fifer_platform.tag_types IS 'Canonical tag type vocabulary; tags.type references tag_types.slug';

-- Seed types required for FK validation and ingest adapter (slug must match tags.type values)
INSERT INTO fifer_platform.tag_types (slug, label, description, sort_order) VALUES
    ('pricing', 'Pricing', 'Price bands and monetary attributes', 10),
    ('promotion', 'Promotion', 'Discounts and promotional intent', 20),
    ('video', 'Video', 'Video realism and rendering quality', 30),
    ('audio', 'Audio / TTS', 'Text-to-speech quality', 40),
    ('ingest', 'Ingest', 'Feed and sync provenance', 50),
    ('routing', 'Routing', 'Publishing and routing', 60),
    ('general', 'General', 'General purpose', 70),
    ('ingest_aliexpress_product', 'AliExpress product ingest', 'Admitad / AliExpress product row mirror', 80)
ON CONFLICT (slug) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- tag_providers: extend registry (idempotent columns)
-- ---------------------------------------------------------------------------
ALTER TABLE fifer_platform.tag_providers ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE fifer_platform.tag_providers ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'generic';
ALTER TABLE fifer_platform.tag_providers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------------
-- tags: required columns (strict) — alter only if missing (forward-compat)
-- ---------------------------------------------------------------------------
ALTER TABLE fifer_platform.tags ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;

-- FK: tags.type -> tag_types.slug (NOT VALID first: allows add on large tables; validate after data repair)
ALTER TABLE fifer_platform.tags DROP CONSTRAINT IF EXISTS fk_fifer_tags_tag_type_slug;
ALTER TABLE fifer_platform.tags
    ADD CONSTRAINT fk_fifer_tags_tag_type_slug
    FOREIGN KEY (type) REFERENCES fifer_platform.tag_types (slug)
    ON UPDATE CASCADE ON DELETE RESTRICT
    NOT VALID;
ALTER TABLE fifer_platform.tags VALIDATE CONSTRAINT fk_fifer_tags_tag_type_slug;

-- ---------------------------------------------------------------------------
-- tag_metrics: normalized metric rows (optional mirror of tags.metrics[] JSONB)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fifer_platform.tag_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES fifer_platform.tags (id) ON DELETE CASCADE,
    metric_key TEXT NOT NULL,
    value_num NUMERIC(24, 8),
    value_text TEXT,
    value_json JSONB,
    unit TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tag_metrics_key_unique UNIQUE (tag_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_fifer_platform_tag_metrics_tag ON fifer_platform.tag_metrics (tag_id);
CREATE INDEX IF NOT EXISTS idx_fifer_platform_tag_metrics_key ON fifer_platform.tag_metrics (metric_key);

-- ---------------------------------------------------------------------------
-- tag_costs: billing / cost tiers per tag (beyond tags.cost_unit / cost_value)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fifer_platform.tag_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES fifer_platform.tags (id) ON DELETE CASCADE,
    billing_unit TEXT NOT NULL DEFAULT 'credit',
    cost_value NUMERIC(18, 6) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'credit',
    tier TEXT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tag_costs_effective_chk CHECK (
        effective_from IS NULL OR effective_to IS NULL OR effective_to > effective_from
    )
);

CREATE INDEX IF NOT EXISTS idx_fifer_platform_tag_costs_tag ON fifer_platform.tag_costs (tag_id);
CREATE INDEX IF NOT EXISTS idx_fifer_platform_tag_costs_effective ON fifer_platform.tag_costs (effective_from, effective_to);

-- ---------------------------------------------------------------------------
-- tag_history: append-only audit rows (queryable; tags.history JSONB remains denormalized cache)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fifer_platform.tag_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES fifer_platform.tags (id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    action TEXT NOT NULL,
    changed_by UUID,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    diff JSONB NOT NULL DEFAULT '{}'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_fifer_platform_tag_history_tag ON fifer_platform.tag_history (tag_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_fifer_platform_tag_history_changed_at ON fifer_platform.tag_history (changed_at DESC);

-- ---------------------------------------------------------------------------
-- tag_associations: link tags to products, campaigns, engines (polymorphic)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fifer_platform.tag_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES fifer_platform.tags (id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'campaign', 'engine')),
    entity_id TEXT NOT NULL,
    role TEXT,
    weight NUMERIC(10, 6),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tag_associations_unique UNIQUE (tag_id, entity_type, entity_id, role)
);

CREATE INDEX IF NOT EXISTS idx_fifer_platform_tag_assoc_entity ON fifer_platform.tag_associations (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fifer_platform_tag_assoc_tag ON fifer_platform.tag_associations (tag_id);

-- ---------------------------------------------------------------------------
-- provider_catalog: provider offerings / SKUs (capabilities, pricing snapshot)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fifer_platform.provider_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES fifer_platform.tag_providers (id) ON DELETE CASCADE,
    external_sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
    availability JSONB NOT NULL DEFAULT '{}'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT provider_catalog_provider_sku_unique UNIQUE (provider_id, external_sku)
);

CREATE INDEX IF NOT EXISTS idx_fifer_platform_provider_catalog_active ON fifer_platform.provider_catalog (is_active);
CREATE INDEX IF NOT EXISTS idx_fifer_platform_provider_catalog_name ON fifer_platform.provider_catalog (name);

COMMENT ON TABLE fifer_platform.tags IS 'TAG-CENTER canonical tags; metrics/virtues/limitations/history as JSONB; version integer.';
COMMENT ON COLUMN fifer_platform.tags.metrics IS 'Flexible JSON array; may mirror tag_metrics rows.';
COMMENT ON TABLE fifer_platform.tag_history IS 'Append-only audit; keep tags.history JSONB in sync in app layer when possible.';
