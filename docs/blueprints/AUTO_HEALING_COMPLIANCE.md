# Protocolo de Auto-Healing evolutivo — GPS y compliance ADN

**Ámbito:** Complementa `scripts/sync-gps.ts`, procesos de auto-sanación del repo y la **§11** de `.cursorrules`.

## 1. Dos capas de validación

| Capa | Qué valida | Responsable |
|------|------------|-------------|
| **GPS (ubicación)** | Presencia de `## UBICACIÓN LÓGICA`, unicidad de `FIFER://...`, generación de `docs/registry/LOCATION_MAP.json` | `npm run sync:gps` |
| **Compliance ADN** | Planos obligatorios, tipos `APP`/`SUB_APP`/`ENGINE`/`SUB_ENGINE`, Hub documentado, Sub-Engines con `_blueprints/`, alineación con Starter Kit | Agentes + revisión; futuros chequeos automatizados |

## 2. Reglas de compliance (marcar para refactor inmediata)

1. **App Hub sin registro o sin planos:** Módulo con tipo `APP` en el mapa pero sin entrada coherente en `src/registry/app-registry.ts` o sin los cinco planos bajo `_blueprints/` donde aplique.
2. **Spoke huérfano:** `SUB_APP` cuyo `_xray_ROUTING.md` no enlaza el Hub padre o no define `subApp` en contratos de datos cuando la API lo requiere.
3. **Engine / Sub-Engine:** Falta de `_xray_CONTRACT.md`, `_xray_LOGIC.md`, `_xray_HEALING.md`, `_xray_DATABASE.md` (o N/A explícito); sub-motor fuera de `sub-engines/` con planos propios.
4. **Legacy ADN:** Código que contradice la norma vigente en `.cursorrules` / `14_CURSORRULES_LIVE.md` (incl. Ley de Evolución Global §11.1).

## 3. Evolución del script GPS

`sync:gps` debe seguir siendo la fuente mecánica de verdad para **anclas y rutas**. Los chequeos de compliance pueden añadirse como fase posterior (lint, CI o extensión del script) que lea `LOCATION_MAP.json` y valide existencia de archivos/planos; hasta que exista, los agentes aplican **§11.3** de forma manual en cada tarea de evolución.

## 4. Coordinación con Auto-Healing

Cualquier auto-generación de planos (p. ej. auditor de motores) debe **reconciliar** el resultado con el ADN actual y propagar cambios a Apps afectadas (Ley de Evolución Global), no solo rellenar archivos vacíos.
