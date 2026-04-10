# 🩻 X-Ray Local: fifer-landing (frontend Next.js)
> ÚLTIMA ACTUALIZACIÓN: 2026-04-07 — Chasis v6 (Boxes + v0 Bridge + `v0-ingestion/`)
> ROL EN FIFER: Landing pública + panel (dashboard) con micro-frontends BoxLoader y API master. **Chasis UI:** `_xray_v0_MASTER.md` (raíz) · **Local landing:** `_xray_v0_local.md`. Puente v0: `_xray_frontend_v0_bridge.md` (raíz).

## 🔴 ESTADO DE SALUD Y ERRORES LOCALES
- [x] **ESTADO ACTUAL:** Diseño tipo Lovable integrado (shell `AppShell`, sidebar Lucide, tokens navy/amarillo). **Sin errores de fusión conocidos.** Conexiones con Content / Ingestor / Finance documentadas en el panel (`/dashboard`) vía mismos clientes `fifer-api` + Supabase; operativas cuando `NEXT_PUBLIC_FIFER_API_BASE_URL` y sesión están configuradas.

## 🏗️ MAPA DE RUTAS Y LÓGICA CORE
- **Ruta Base API (browser):** `NEXT_PUBLIC_FIFER_API_BASE_URL` → `/api/v1/master/*` (ver `src/lib/fifer-api.ts`)
- **Supabase:** `src/lib/supabase.ts` — sesión para `Authorization: Bearer` en llamadas master
- **Rutas app:** `(marketing)/*` landing; `(dashboard)/dashboard` panel + boxes; `/campaigns`, `/finance`, `/settings`, `/affiliates`

## 🧩 FRONTEND BOXES EXPORTADAS (Micro-Frontends)
- **DashboardBoxSlots** — **Slot destino:** `dashboard_top` (grid 12 cols)
  - **Estado:** Activo — instancias `BoxLoader` para módulos content / ingestor / finance (`boxManifests.ts`)

## 🔗 CONTRATOS EXTERNOS Y DEPENDENCIAS
- **APIs:** Master API (URL campaign, AI capabilities, finance report, engines)
- **OAuth:** TikTok `/api/tiktok/*` routes

## 🔑 VARIABLES DE ENTORNO REQUERIDAS
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_FIFER_API_BASE_URL`
- (Opcional) Analytics, etc. según `.env.example`
