<!--
  SNAPSHOT v0_pack — GPS (coordenadas lógicas FIFER://)
  Fuente canónica: docs/registry/LOCATION_MAP.json (regenerar con npm run sync:gps)
  Copiado / congelado en auditoría: 2026-04-11
-->

# GPS — mapa lógico FIFER (`LOCATION_MAP.json`)

## Cómo se actualiza

Desde la raíz del repositorio:

```bash
npm run sync:gps
```

El script `scripts/sync-gps.ts` recorre `src/`, localiza carpetas de módulo con `_blueprints/` que contengan `_xray_*.md`, extrae **`## UBICACIÓN LÓGICA`** y la URI **`FIFER://...`**, y reescribe **`docs/registry/LOCATION_MAP.json`**. No editar el JSON a mano salvo emergencia; volver a ejecutar GPS tras mover carpetas.

## Reglas

- **Una URI por módulo:** todos los planos del mismo módulo deben acordar la misma ancla (el script falla si hay conflicto).
- **Tipos:** `APP`, `SUB_APP`, `ENGINE`, `SUB_ENGINE` los infiere la ruta física bajo `src/`.
- **X-Rays fuera de `src/`** (`docs/`, `prisma/`, `FIFER_CORE/`) **no** entran en este mapa con el script actual.

## Snapshot JSON (2026-04-11)

```json
{
  "FIFER://APP/CONTRATOS": {
    "path": "src/app/(dashboard)/contratos",
    "type": "APP"
  },
  "FIFER://APP/DASHBOARD": {
    "path": "src/app/(dashboard)/dashboard",
    "type": "APP"
  },
  "FIFER://APP/DASHBOARD_INMOBILIARIO": {
    "path": "src/app/(dashboard)/dashboardinmobiliario",
    "type": "APP"
  },
  "FIFER://APP/DESARROLLADOR": {
    "path": "src/app/(dashboard)/desarrollador",
    "type": "APP"
  },
  "FIFER://APP/MISBOTS": {
    "path": "src/app/(dashboard)/misbots",
    "type": "APP"
  },
  "FIFER://ENGINE/AI_FALLBACK_CASCADE": {
    "path": "src/engines/ai-fallback-cascade",
    "type": "ENGINE"
  },
  "FIFER://ENGINE/API_MANAGER": {
    "path": "src/lib",
    "type": "ENGINE"
  },
  "FIFER://ENGINE/NORMATIVA": {
    "path": "src/app/(dashboard)/dom/normativa",
    "type": "SUB_APP",
    "targetAppOrEngine": "normativa"
  },
  "FIFER://ENGINE/SYSTEM_HEALTH": {
    "path": "src/engines/system-health",
    "type": "ENGINE"
  },
  "FIFER://SUB_ENGINE/AI_FALLBACK_CASCADE/COMMS": {
    "path": "src/engines/ai-fallback-cascade/sub-engines/comms",
    "type": "SUB_ENGINE"
  },
  "FIFER://SUB_ENGINE/AI_FALLBACK_CASCADE/IMAGE_GEN": {
    "path": "src/engines/ai-fallback-cascade/sub-engines/image-gen",
    "type": "SUB_ENGINE"
  }
}
```

## Lectura normativa ampliada

Ver también `v0_pack/14_CURSORRULES_LIVE.md` sección **COORDENADAS LÓGICAS — GPS ACTIVO** (§10).
