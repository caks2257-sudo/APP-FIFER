# Informe de Sanidad de Código — Ecosistema FIFER

**Auditor:** SRE / Arquitecto Principal (Cursor)  
**Fecha de referencia:** 2026-04-11  
**Versión ADN analizada:** `.cursorrules` **v6.3** — *Observabilidad Total + Salud Arquitectónica*  
**Alcance:** Código fuente bajo `src/`, registro GPS `docs/registry/LOCATION_MAP.json`, planos `_blueprints/`, reglas maestras.  
**Nota:** Este documento es **solo diagnóstico**; no incluye parches ni refactors.

---

## Resumen ejecutivo

| Área | Estado global |
|------|----------------|
| Constitución ADN (§14–§20) | [ADVERTENCIA] — Cumplimiento parcial; hay desviaciones claras en Data-Driven UI, acoplamiento App→Engine y taxonomía GPS |
| Matriz `LOCATION_MAP.json` vs disco | [ADVERTENCIA] — Sin rutas fantasma; 1 módulo con planos huérfano respecto al GPS; tipos de módulo inconsistentes en el JSON |
| Desacoplamiento FE / BE | [ADVERTENCIA] — Sin fugas `fs`/`path`/`crypto` en `.tsx`; sí hay imports directos de motores desde Client Components y tipos compartidos vía rutas físicas de engine |
| Planos X-Ray / Auto-Healing | [ADVERTENCIA] — Motores con planos incompletos a nivel raíz; sub-app Perfil sin entrada GPS; script `sync-gps` desalineado con la ruta real `src/app/[locale]/(dashboard)/` |

---

## 1. Cumplimiento del ADN (`.cursorrules` v6.3+)

### 1.1 §14 — Soberanía de conexiones (Macro-Pilares, Bridge, UI)

**[SALUDABLE] (parcial, con matices)**

- El flujo principal de conexiones externas pasa por **`/api/v1/external-bridge/status`** y el hook `useExternalBridge`, alineado con la idea de estado agregado y no exposición de secretos en cliente (`useExternalBridge.ts`).
- **`ExternalConnectionsPanel`** agrupa por categorías **INTELIGENCIA_ARTIFICIAL**, **FINANZAS_PAGOS**, etc., coherente con la taxonomía §14. El orden fijo `CATEGORY_ORDER` es una **convención de presentación** (no una lista de “conexiones” inventada); las filas reales vienen del payload.
- **§14.5 (solo lectura en producción):** la restricción de edición en localhost se apoya en `useIsLocalhostClient` en componentes de gestión — patrón acorde al ADN.

**[ADVERTENCIA]**

- Cualquier **nueva** categoría o prefijo que solo exista en UI y no en `external-bridge-engine` + documentación `_xray_EXTERNAL_BRIDGE.md` rompería §14.1–§14.2; conviene validar en revisiones de PR que el descubrimiento servidor siga siendo la fuente de verdad.

### 1.2 §18 — Data-Driven UI (sin listas duras de motores / conexiones / métricas)

**[ADVERTENCIA]**

- **Sala de Guerra / telemetría de motores:** `WarRoomPanel` y `GET /api/v1/war-room` consumen `engines` desde `system-health` (payload dinámico por `EngineRegistry`) — **bien orientado a §18** para la parrilla de motores.
- **`system-health/index.ts`** define `ENGINE_PROBE_IDS` como lista **estática** en el motor. Es servidor, no UI, pero **sigue siendo una lista manual**: un motor nuevo puede quedar fuera de sondas hasta que alguien edite el array (deuda operativa vs “descubrimiento automático”).
- **`developer-telemetry.ts` — `telemetryFromInternalApis`:** asume **exactamente** dos endpoints lógicos (`misbots`, `contratos`) en el payload interno. No itera un array del backend; es un acoplamiento fijo a dos rutas de producto.
- **`src/boxes/registry/ChartBox.tsx`:** datos de gráfico **completamente hardcodeados** (`chartData` mensual). Es el ejemplo más claro de violación §18 en componente de presentación: no hay payload ni API.
- **`useUserDnaStore.ts`:** identidad y Fractal DNA **inicial** con nombres, RUT y fechas fijas (demo/local). No es “lista de motores”, pero contradice el espíritu §2/§9 de ADN persistido vía API para entornos reales.

**[CRÍTICO]** (respecto al espíritu §18 para paneles operativos)

- Cualquier componente de dashboard que siga mostrando series o KPIs **solo desde constantes** sin ruta de datos unificada incrementa la deuda “no Data-Driven” y obliga a refactors manuales cuando el backend crezca.

### 1.3 §19 — Layout autónomo (sin “stretch” vertical forzado)

**[ADVERTENCIA]**

- **`WarRoomPanel`** usa `grid` con enfoque de tarjetas; no se observa un patrón masivo de igualar alturas de cajas vecinas.
- Hay usos puntuales de **`items-stretch`** en `TelemetryHeaderBox`, `Sidebar` (nav item) y `ApiKeyManager` — en contextos de **flex** para alinear controles o cabecera, no necesariamente igualando altura de “cards” de datos. Clasificación: revisar caso a caso si alguna vista de negocio fuerza alturas homogéneas entre cajas de contenido distinto.

### 1.4 §20 — Vistas dinámicas y Auto-Healing visual (degradación elegante)

**[ADVERTENCIA]**

- **`FinanceCashflowChart`** y **`LiquidityForecastBox`:** manejan vacíos, carga y circuit breaker con mensajes y layout alternativo — **alineado** con degradación razonable.
- **`ChartBox` (`src/boxes/registry/ChartBox.tsx`):** no implementa mutación a lista/tabla ante fallo de gráfico ni datos incompatibles: es un gráfico demo estático — **no cumple** el patrón §20 si se usa como panel de datos real.

### 1.5 §13 — i18n (contexto cruzado con “datos hardcodeados”)

**[ADVERTENCIA]**

- Varios componentes de sistema (`WarRoomPanel`, `ExternalConnectionsPanel`, `TelemetryHeaderBox`) contienen **strings en español** inline. El ADN exige diccionarios (`messages/*.json`) para copy de producto; la Sala de Guerra y paneles de desarrollo deberían migrarse a namespaces `next-intl` para cumplimiento estricto §13.

---

## 2. Fugas y huérfanos — Matriz (`LOCATION_MAP.json`) vs realidad

### 2.1 Metodología

- Se compararon las **rutas `path`** de `docs/registry/LOCATION_MAP.json` contra existencia en disco: **ninguna ruta del mapa apunta a un directorio inexistente** (0 anclas fantasma en verificación por `Test-Path`).
- Se enumeraron **raíces de módulo** como directorios padre de cualquier `_blueprints/` bajo `src/` y se contrastaron con el conjunto de `path` del GPS.

### 2.2 [ADVERTENCIA] — “Motores / módulos huérfanos” (planos sin entrada en el GPS)

| Ruta física | Observación |
|-------------|-------------|
| `src/app/[locale]/(dashboard)/dashboard/perfil` | Contiene `_blueprints/` (`_xray_UI.md`, `_xray_DATA.md`, `_xray_DATABASE.md`) pero **no aparece** en `LOCATION_MAP.json`. Causa probable: ningún plano incluye cabecera **`## UBICACIÓN LÓGICA`** con ancla `` `FIFER://...` `` (el `_xray_UI.md` actual documenta solo UI, sin ancla GPS). |

**Resto de módulos con `_blueprints/` bajo `src/`:** coinciden con una entrada del mapa (28 entradas en JSON vs 29 módulos con planos; el único desajuste es **perfil**).

### 2.3 [ADVERTENCIA] — Rutas de producto sin ancla GPS (no necesariamente error)

Bajo `src/app/[locale]/(dashboard)/dom/` existen segmentos (`permisos`, `recepcion`, `regularizaciones`, etc.) que pueden ser **Sub-Apps** o rutas anidadas sin carpeta `_blueprints` propia — no se listan como huérfanos GPS salvo que el equipo espere anclas `FIFER://` por segmento (Hub & Spoke §11.2).

### 2.4 [ADVERTENCIA] — Calidad del mapa maestro (no solo existencia)

- Varias claves **`FIFER://APP/...`** tienen **`"type": "ENGINE"`** en el JSON. Por §10 y por el propio `scripts/sync-gps.ts`, las Apps bajo el árbol de dashboard deberían clasificarse como **`APP`** / **`SUB_APP`**, no como `ENGINE`.
- Causa raíz probable: **`classifyModule`** en `scripts/sync-gps.ts` solo reconoce prefijo `src/app/(dashboard)/`, mientras el repo real usa **`src/app/[locale]/(dashboard)/`**. Los módulos de app **no coinciden** con esa rama y caen en el **`return 'ENGINE'`** por defecto (comentado para `src/lib`).
- **`FIFER://ENGINE/API_MANAGER` → `src/lib`:** el path existe y el plano `_xray_COMMS.md` declara ancla `FIFER://ENGINE/API_MANAGER`. Semánticamente es **capa de librería / API interna**, no un motor bajo `src/engines/`; la entrada es válida como “espejo” pero puede confundir auditorías que solo miren `src/engines/`.

### 2.5 [SALUDABLE] — Motores bajo `src/engines/`

**Carpetas de primer nivel presentes:** `ai-fallback-cascade`, `bot-engine`, `dom-engine`, `external-bridge-engine`, `finance-engine`, `forecast-core`, `system-engine`, `system-health`.

Todas tienen correspondencia en `LOCATION_MAP.json` (directamente o como sub-engines). No hay carpeta de motor “completamente fuera” del GPS.

---

## 3. Desacoplamiento frontend / backend

### 3.1 Fugas de APIs Node (`fs`, `path`, `crypto`) hacia UI React

**[SALUDABLE]**

- No se encontraron imports de `fs` / `path` / `crypto` (ni `node:*`) en archivos **`.tsx`** bajo `src/`.
- Usos legítimos en **servidor / motores / lib:** p. ej. `architecture-probe.ts` (`fs/promises`, `path`), `env-manager` (`node:fs/promises`, `node:path`), `lib/storage.ts` y `lib/api-manager.ts` / `bridge-credential-crypto.ts` (`node:crypto`).

**[ADVERTENCIA]**

- **`useUserDnaStore.ts`:** comentarios con imports `node:fs` / `node:path` comentados — no activos, pero indica riesgo histórico; mantener vigilancia para que no se reactiven en cliente.

### 3.2 Imports directos de motores desde páginas y hooks de App (§5.1)

**[ADVERTENCIA]**

El ADN indica que las Apps **no deben acoplarse** importando motores por ruta física; el canal esperado es **`EngineRegistry`** y APIs.

Ejemplos reales:

| Ubicación | Patrón |
|-----------|--------|
| `src/app/[locale]/(dashboard)/misbots/*.tsx` | `import '@/engines/bot-engine'`, tipos desde `@/engines/bot-engine`, `EngineRegistry.use('bot-engine')` |
| `src/app/[locale]/(dashboard)/finanzas/useLiquidityForecast.ts`, `LiquidityForecastBox.tsx` | Tipos y esquemas Zod desde `@/engines/forecast-core/sub-engines/cashflow-liquidity/schemas` |
| `src/app/[locale]/(dashboard)/desarrollador/page.tsx` | Tipos desde `@/engines/system-health/architecture-types` y `public-types` |

**Interpretación:** El uso de **`EngineRegistry` en cliente** puede ser aceptable como fachada; el problema de sanidad arquitectónica es la **dependencia en la ruta física del motor** para **tipos y side-effects de import** (`import '@/engines/bot-engine'`), que acopla la App al árbol `src/engines/*` y dificulta límites de bundle y políticas de capa limpia.

### 3.3 Interfaces / tipos en archivos `*-types.ts`

**[ADVERTENCIA]**

- Solo un conjunto muy pequeño de archivos coincide con `**/*-types.ts` en `src` (p. ej. `system-health/architecture-types.ts`, `system-health/public-types.ts`, `components/v0-ingestion/box-types.ts`).
- Muchos contratos viven junto a implementaciones (`developer-telemetry.ts`, componentes con `type Props` inline, tipos en `hooks/`). **No es incorrecto per se**, pero **no cumple** una convención estricta “todo en `*-types.ts`” si el equipo la hubiera fijado como norma interna.

---

## 4. Salud del Auto-Healing y planos `_blueprints/`

### 4.1 Ubicación de planos

- No existe carpeta **`_blueprints/` en la raíz del repo**; los planos viven **por módulo** bajo cada App y Engine (`src/**/_blueprints/`). Coherente con §1 y §5 de `.cursorrules`.

### 4.2 [ADVERTENCIA] — Planos obligatorios de motor (§5.2)

Para cada **motor**, el ADN exige: `_xray_CONTRACT.md`, `_xray_LOGIC.md`, `_xray_HEALING.md`, `_xray_DATABASE.md`.

| Módulo | `_xray_LOGIC.md` | `_xray_CONTRACT.md` | `_xray_HEALING.md` | `_xray_DATABASE.md` | Notas |
|--------|-------------------|---------------------|--------------------|--------------------|--------|
| `src/engines/finance-engine` (raíz) | Sí | **No** | **No** | **No** | Solo un plano lógico a nivel padre; sub-motores sí tienen contratos/healing/database |
| `src/engines/system-engine` (raíz) | Sí | **No** | **No** | **No** | Sub-engine `env-manager` sí tiene planos más completos |

### 4.3 [ADVERTENCIA] — `_xray_UI.md` en motores

- El ADN **§5.2** lista para **Engines**: CONTRACT, LOGIC, HEALING, DATABASE — **no exige** `_xray_UI.md` a nivel motor.
- En la práctica del repo, **`system-health`** incluye `_xray_UI.md`; el resto de motores **no**. Si la auditoría pide explícitamente “LOGIC + UI para cada motor”, hay **brecha respecto a esa expectativa**, no respecto al texto literal §5.2 para engines.

### 4.4 [SALUDABLE] — API §17 (salud arquitectónica consumible)

- Existe **`GET /api/v1/system-health/architecture`** (`src/app/api/v1/system-health/architecture/route.ts`) que devuelve `ArchitectureHealthSnapshot` desde `runArchitectureProbe`, alineado con §17.

### 4.5 [CRÍTICO] — Riesgo operativo del GPS (`sync:gps`)

- Hasta que **`classifyModule`** contemple `src/app/[locale]/(dashboard)/`, el mapa **clasificará mal** las Apps y mezclará semántica `APP` vs `ENGINE`.
- Módulos sin **`## UBICACIÓN LÓGICA`** + `` `FIFER://...` `` en ningún `_xray_*.md` **no se registrarán** (caso **perfil**).

---

## 5. Plan de Armonización Recomendado (siguiente fase)

Pasos **ordenados** y accionables (sin implementación en este informe):

1. **Corregir `scripts/sync-gps.ts`:** extender `classifyModule` para rutas `src/app/[locale]/(dashboard)/...` (y mantener compatibilidad con cualquier variante legacy). Volver a ejecutar `npm run sync:gps` y revisar dif en `LOCATION_MAP.json` (tipos `APP`/`SUB_APP`/`ENGINE`).

2. **Anclar `dashboard/perfil`:** añadir en un plano bajo `dashboard/perfil/_blueprints/` la cabecera **`## UBICACIÓN LÓGICA`** con URI estable `FIFER://...` coherente con Hub & Spoke; ejecutar sync GPS y verificar entrada nueva.

3. **§18 — Eliminar o aislar datos demo:** sustituir `src/boxes/registry/ChartBox.tsx` por datos vía props/API o retirarlo del catálogo de cajas de producto; auditar otros `const [...] = [` en `components/` y `boxes/`.

4. **§5.1 — Reducir imports físicos de engines en App Router cliente:** mover contratos Zod/tipos públicos a un paquete neutral (`src/types/contracts/...` o exports explícitos “public API” del motor) y reservar `import '@/engines/...'` para **API routes / server** o inicialización única; valorar hooks que solo llamen REST y consuman tipos inferidos del schema de respuesta.

5. **`system-health` — Sondas:** evolucionar `ENGINE_PROBE_IDS` hacia descubrimiento basado en `EngineRegistry` o lista emitida por el propio registro, para alinear el espíritu §18 en el servidor.

6. **`telemetryFromInternalApis`:** generalizar a un arreglo de endpoints o a un payload que el backend de `system-health` exponga como lista, en lugar de `misbots`/`contratos` fijos.

7. **Planos de motor incompletos:** completar en `finance-engine` y `system-engine` (raíz) los planos faltantes del §5.2 o documentar **N/A** explícito en `_xray_DATABASE.md` donde corresponda, con enlaces a esquema compartido.

8. **§13 i18n:** extraer cadenas de Sala de Guerra, telemetría y conexiones externas a `messages/es-CL.json` / `en-US.json`.

9. **§19 revisión visual:** auditar vistas de negocio que usen `items-stretch` en grids de tarjetas comparables y migrar a `items-start` / masonry según §19.

10. **Verificación continua:** incorporar en CI o en `runArchitectureProbe` una comprobación de que **toda** carpeta con `_blueprints/` tenga ancla GPS **o** esté excluida explícitamente por convención documentada.

---

## Cierre

Este informe refleja el estado del repositorio en la fecha indicada. La severidad **[CRÍTICO]** se reserva a riesgos que bloquean gobernanza (GPS incorrecto, planos huérfanos de ancla) o deuda que impide escalar el modelo Data-Driven sin reescrituras manuales constantes.

**Archivo generado:** `fifer_sanity_report_cursor.md` (raíz del proyecto).
