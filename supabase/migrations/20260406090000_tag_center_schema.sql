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
