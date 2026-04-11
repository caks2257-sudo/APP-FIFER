-- FIFER — ADN Universal: enum de scopes, InternalApiKey, tablas core (Bot, Contract, Document).
-- Alineado con prisma/schema.prisma e identificadores en PascalCase entre comillas dobles.
-- Idempotente: CREATE IF NOT EXISTS / comprobación de tipo enum vía pg_catalog.

-- Enum: internal_api_key_scope (READ_ONLY | FULL_ACCESS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'internal_api_key_scope'
  ) THEN
    CREATE TYPE public.internal_api_key_scope AS ENUM ('READ_ONLY', 'FULL_ACCESS');
  END IF;
END
$$;

-- User: requerida por FKs de InternalApiKey y tablas core (ids tipo cuid en aplicación).
CREATE TABLE IF NOT EXISTS public."User" (
  id          text PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  name        text NOT NULL,
  role        text NOT NULL DEFAULT 'user',
  tier        text NOT NULL DEFAULT 'free',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."InternalApiKey" (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  "apiKey"            text NOT NULL UNIQUE,
  scope               public.internal_api_key_scope NOT NULL DEFAULT 'READ_ONLY',
  "targetAppOrEngine" text NOT NULL,
  "ownerId"           text NOT NULL REFERENCES public."User" (id) ON DELETE CASCADE,
  "createdAt"         timestamptz NOT NULL DEFAULT now(),
  "updatedAt"         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."Bot" (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  status      text NOT NULL,
  "modelId"   text NOT NULL,
  "avatarUrl" text,
  "mainApp"   text NOT NULL DEFAULT 'misbots',
  "subApp"    text,
  metadata    jsonb,
  "ownerId"   text NOT NULL REFERENCES public."User" (id) ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."Contract" (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  status      text NOT NULL,
  "mainApp"   text NOT NULL DEFAULT 'contratos',
  "subApp"    text,
  metadata    jsonb,
  "ownerId"   text NOT NULL REFERENCES public."User" (id) ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."Document" (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  "fileUrl"    text NOT NULL,
  "fileType"   text NOT NULL,
  size         integer NOT NULL,
  "bucketPath" text NOT NULL,
  "mainApp"    text NOT NULL,
  "subApp"     text,
  metadata     jsonb,
  "ownerId"    text NOT NULL REFERENCES public."User" (id) ON DELETE CASCADE,
  "createdAt"  timestamptz NOT NULL DEFAULT now(),
  "updatedAt"  timestamptz NOT NULL DEFAULT now()
);

-- Índices de rendimiento: ownerId (core + llaves) y targetAppOrEngine (InternalApiKey)
CREATE INDEX IF NOT EXISTS "InternalApiKey_ownerId_idx" ON public."InternalApiKey" ("ownerId");
CREATE INDEX IF NOT EXISTS "InternalApiKey_targetAppOrEngine_idx"
  ON public."InternalApiKey" ("targetAppOrEngine");

CREATE INDEX IF NOT EXISTS "Bot_ownerId_idx" ON public."Bot" ("ownerId");
CREATE INDEX IF NOT EXISTS "Contract_ownerId_idx" ON public."Contract" ("ownerId");
CREATE INDEX IF NOT EXISTS "Document_ownerId_idx" ON public."Document" ("ownerId");
