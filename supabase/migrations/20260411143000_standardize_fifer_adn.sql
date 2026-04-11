-- FIFER — Estandarización ADN en Postgres (mainApp, subApp, metadata)
-- Idempotente: renombra sourceApp → mainApp solo si existe; añade columnas si faltan.
-- Tablas según Prisma (modelos User, Bot, Contract, Document) en schema public.
-- Los nombres físicos pueden ser "Bot" o "bot" según cómo se creó la tabla; %I cita bien el identificador real.

-- Bot
DO $$
DECLARE
  t text;
BEGIN
  SELECT c.relname INTO t
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN ('Bot', 'bot')
  ORDER BY CASE WHEN c.relname = 'Bot' THEN 0 ELSE 1 END
  LIMIT 1;

  IF t IS NULL THEN
    RAISE NOTICE 'public.Bot/bot: tabla no encontrada, se omite bloque Bot';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = t
      AND column_name = 'sourceApp'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
      t,
      'sourceApp',
      'mainApp'
    );
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I TEXT',
    t,
    'subApp'
  );
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I JSONB',
    t,
    'metadata'
  );
END $$;

-- Contract
DO $$
DECLARE
  t text;
BEGIN
  SELECT c.relname INTO t
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN ('Contract', 'contract')
  ORDER BY CASE WHEN c.relname = 'Contract' THEN 0 ELSE 1 END
  LIMIT 1;

  IF t IS NULL THEN
    RAISE NOTICE 'public.Contract/contract: tabla no encontrada, se omite bloque Contract';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = t
      AND column_name = 'sourceApp'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
      t,
      'sourceApp',
      'mainApp'
    );
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I TEXT',
    t,
    'subApp'
  );
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I JSONB',
    t,
    'metadata'
  );
END $$;

-- Document
DO $$
DECLARE
  t text;
BEGIN
  SELECT c.relname INTO t
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN ('Document', 'document')
  ORDER BY CASE WHEN c.relname = 'Document' THEN 0 ELSE 1 END
  LIMIT 1;

  IF t IS NULL THEN
    RAISE NOTICE 'public.Document/document: tabla no encontrada, se omite bloque Document';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = t
      AND column_name = 'sourceApp'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
      t,
      'sourceApp',
      'mainApp'
    );
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I TEXT',
    t,
    'subApp'
  );
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I JSONB',
    t,
    'metadata'
  );
END $$;
