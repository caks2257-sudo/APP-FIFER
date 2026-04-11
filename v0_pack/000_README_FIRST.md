# FIFER — Léeme primero (`v0_pack`)

**Audiencia:** humanos, Gemini, v0 y cualquier agente que ingiera contexto de producto antes de tocar código.

---

## Quién es Cristobal

**Cristobal** es el **arquitecto y manager** del ecosistema FIFER: define gobernanza técnica (planos X-Ray, GPS, ADN de datos), prioriza qué Apps y Engines existen y cómo se comunican, y exige que la documentación sea **espejo verificable** del código — no relato estático desconectado del repo.

---

## Qué es FIFER

**FIFER** es una plataforma **SaaS inmobiliaria y de operación** construida sobre **Next.js (App Router)**, **Prisma** y **Supabase**, con Apps bajo `src/app/(dashboard)/`, motores aislados en `src/engines/` y comunicación App ↔ Engine gobernada por **llaves internas** (`InternalApiKey`) y registro en planos de comunicación. La arquitectura es **fractal**: Apps, sub-apps, engines y sub-engines tienen `_blueprints/` con planos especializados (UI, DATA, ROUTING, HEALING, DATABASE, CONTRACT, LOGIC, COMMS).

---

## Las tres leyes sagradas

1. **ADN (datos y pertenencia)**  
   Toda entidad de negocio relevante lleva **pertenencia y contexto de app**: al menos `ownerId` (usuario), y donde aplique `mainApp`, `subApp` opcional y `metadata` (JSON), alineado a `prisma/schema.prisma` y a los espejos `_xray_DATABASE.md`.

2. **GPS (identidad lógica)**  
   Cada módulo anclado expone **`## UBICACIÓN LÓGICA`** y una URI **`FIFER://...`** en al menos un plano bajo su `_blueprints/`. El mapa canónico **`docs/registry/LOCATION_MAP.json`** se **regenera** con `npm run sync:gps` — no se edita a mano.

3. **Espejo (X-Ray vivo)**  
   Los archivos `_xray_*.md` deben **reflejar código y esquema reales** (rutas, modelos Prisma, contratos). Si el texto y el código divergen, gana el código y el espejo debe actualizarse. Queda prohibido el X-Ray meramente narrativo sin anclaje verificable.

---

## Qué hay en `v0_pack/`

| Ruta | Uso |
|------|-----|
| `000_README_FIRST.md` | Este documento — contexto mínimo del ecosistema. |
| `templates/` | Snapshots de referencia para ingestión externa (p. ej. `SNAPSHOT_xray_*.md`). |
| `14_CURSORRULES_LIVE.md` | Espejo de reglas maestras (sincronizado desde `.cursorrules` cuando corresponda). |
| `ui-kit/`, `blocks/` | Activos de diseño / bloques exportados (convención del proyecto). |

**Regla:** Los snapshots bajo `templates/` son **copias de trabajo** para contexto; la **fuente de verdad** sigue siendo el repo (`prisma/`, `src/`, `docs/`).
