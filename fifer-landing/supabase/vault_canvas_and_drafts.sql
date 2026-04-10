-- FIFER Vault: lienzo DataCanvas + borradores de contenido (Supabase).
-- Ejecutar en SQL Editor o vía migraciones. Requiere extensión pgcrypto para gen_random_uuid().

create table if not exists public.fifer_canvas_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  canvas_key text not null default 'default',
  nodes jsonb not null default '[]'::jsonb,
  connections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, canvas_key)
);

create index if not exists fifer_canvas_states_user_updated_idx
  on public.fifer_canvas_states (user_id, updated_at desc);

create table if not exists public.fifer_content_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  node_id text not null,
  engine_id text not null,
  excerpt text,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fifer_content_drafts_user_created_idx
  on public.fifer_content_drafts (user_id, created_at desc);

-- Opcional: habilitar RLS y políticas por usuario si dejas de usar solo service role en API.
-- alter table public.fifer_canvas_states enable row level security;
-- alter table public.fifer_content_drafts enable row level security;
