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
5. **`.env` y Macro-Pilares:** integraciones nuevas deben mapearse a los cinco `BridgeConnectionCategory` y, cuando se autorice escritura en `.env`, respetar bloques físicos `# === … ===` por pilar (`.cursorrules` §15); el motor `external-bridge-engine` y el hub deben permanecer alineados con `docs/blueprints/_xray_EXTERNAL_BRIDGE.md`.

## 3. Evolución del script GPS

`sync:gps` debe seguir siendo la fuente mecánica de verdad para **anclas y rutas**. Los chequeos de compliance pueden añadirse como fase posterior (lint, CI o extensión del script) que lea `LOCATION_MAP.json` y valide existencia de archivos/planos; hasta que exista, los agentes aplican **§11.3** de forma manual en cada tarea de evolución.

## 4. Coordinación con Auto-Healing

Cualquier auto-generación de planos (p. ej. auditor de motores) debe **reconciliar** el resultado con el ADN actual y propagar cambios a Apps afectadas (Ley de Evolución Global), no solo rellenar archivos vacíos.

## 5. Salud arquitectónica consumible por API

La **Salud Arquitectónica** (sincronización X-Ray / GPS, versión del ADN, estado de la matriz de Auto-Healing) **DEBE** poder ser **consumida por clientes y la Sala de Guerra** vía una **API de agregación** dedicada, p. ej. **`GET /api/v1/system-health/architecture`**, que devuelva un payload estable (versiones, timestamps de último `sync:gps`, señales de compliance o flags derivados de `LOCATION_MAP.json` y de los procesos de healing cuando existan). Hasta que la ruta esté implementada, el contrato debe documentarse en `docs/blueprints/` y alinearse con `.cursorrules` §17; la implementación no sustituye la fuente canónica de anclas (`docs/registry/LOCATION_MAP.json` + scripts GPS).
