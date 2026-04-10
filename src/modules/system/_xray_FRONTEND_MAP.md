# FIFER — Frontend Blueprint (`_xray_FRONTEND_MAP`)

> **Rol:** Mapa vivo entre **artefactos v0** y el **shell productivo** (Next.js bajo `fifer-landing/`). v0 genera micro-UI; Cursor y el runtime **encierran** cada pieza en `BoxLoader`, contrato **`BoxProps`** y grid **12 columnas**. Este archivo es la **plantilla de recepción**: rellenar cuando un nuevo Box entre al catálogo.

**Contrato:** [`_xray_PROTOCOL_SHELL.md`](../../../_xray_PROTOCOL_SHELL.md) · **Chasis:** [`_xray_v0_MASTER.md`](../../../_xray_v0_MASTER.md) · **Tipos:** `fifer-landing/src/types/fifer-box.ts`, `fifer-landing/src/types/ui-schema.ts`.

---

## 1. Component hierarchy (árbol v0 → shell)

*Árbol de componentes **entregados por v0** y cómo se anidan bajo el shell. Actualizar por cada integración.*

```
PageOrchestrator
├── AppShell / layout dashboard
│   ├── SidebarAuto
│   ├── GlobalCommander / UICommander
│   └── Slot region (grid 12)
│       └── DraggableBoxWrapper (dnd-kit)
│           └── BoxLoader                    ← envoltorio obligatorio
│               └── [Box v0 desde v0-ingestion]   ← artefacto v0 (nombre del componente)
```

| Nivel | Responsabilidad | Rutas / piezas típicas |
| :--- | :--- | :--- |
| Orquestación | Ruta, slots, comandos | `PageOrchestrator.tsx`, `(dashboard)/layout.tsx` |
| Caja | Hidratación, errores, tema | `BoxLoader.tsx`, `BoxErrorBoundary.tsx` |
| Contenido v0 | UI rica del módulo | `fifer-landing/src/components/v0-ingestion/boxes/*.tsx` |

**Registro:** cada Box nuevo debe existir en `v0-ingestion/registry.ts` + `fifer-landing/src/registry/box-catalog.ts` (y manifiesto si aplica).

---

## 2. State management (Protocolo Shell → props)

*Mapa de **cómo el shell inyecta y consume** la superficie `BoxProps` y metadata SDUI.*

| Superficie | Origen típico | Uso en UI |
| :--- | :--- | :--- |
| `data` | Bridge / adapters (`fifer-api`, mocks normalizados) | Tablas, KPIs, listas; **no** datos sensibles hardcodeados en el `.tsx` v0. |
| `config` (`BoxUIConfig`) | Orquestador / manifest | `table` \| `chart` \| `form` según `ui-schema.ts`. |
| `isLoading` | Fetch JIT, suspense del box | Skeleton / Ghost; no bloquear el grid completo. |
| `error` | API, parse, boundary | Propaga a `DiscoveryBox` o fallback del loader. |
| `isLocked` | BYOK, permisos | Overlay / CTA de conexión alineado con [`_xray_INTEGRATIONS.md`](./_xray_INTEGRATIONS.md). |
| `isRefining` | Dual-stage (Etapa 1) | Estado “Pulido de prompt”; no sustituir salida final hasta `false`. |

**Store global de layout:** `useLayoutStore` — `userLayout`, `slotOrder`, expansión; **no** duplicar en props del Box salvo slices derivados para animación local.

**Data Weaver (fusión multi-módulo):** motor en `src/core/dataWeaver.ts`, hook `useDataWeaver` en `fifer-landing/src/hooks/useDataWeaver.ts`. Criterios `date` | `roi`; salida con capa `normalized` compatible con gráficos/tablas SDUI (`BoxProps.data`).

---

## 3. Animation logic (Framer Motion — diccionario)

*Gestos y **triggers** acordados; evitar motion competidor con `dnd-kit` en el mismo eje.*

| ID / gesto | Trigger (condición) | Implementación sugerida | Notas |
| :--- | :--- | :--- | :--- |
| `layout-shift` | Cambio de `layout` / span en grid | `motion.div` + `layout` | Respetar `prefers-reduced-motion`. |
| `box-enter` | Montaje de caja en slot | `initial` / `animate` suaves (opacity, y) | Duración corta; no tapar contenido crítico. |
| `box-flip` | AI-Flip / chat contextual | Rotación o crossfade en contenedor del Box | Debe vivir **dentro** del wrapper del Box, no del grid completo. |
| `commander-toast` | Comando UI reconocido | Micro-animación en toast host | `AmbientFeedback` / alert host si aplica. |
| `drag-preview` | `drag-active` (dnd-kit) | Estilos en `DraggableBoxWrapper` | Prioridad al feedback nativo de **dnd-kit**; Motion solo secundario. |

**Prohibido:** animaciones que impidan lectura del contraste **Deep Navy** / **Electric Yellow** (`docs/styleguide.md`).

---

## 4. Slot mapping (grid 12 — qué ocupa qué celda)

*Convención MASTER: grid de **12 columnas**. Documentar **span** y **orden** por ruta o módulo.*

| Slot / región | Columnas (ejemplo) | Componente(s) anclado(s) | `boxId` / notas |
| :--- | :--- | :--- | :--- |
| *(principal)* | `col-span-12` o `lg:col-span-8` | *(rellenar tras diseño v0)* | Manifiesto `targetSlot` |
| *(lateral)* | `lg:col-span-4` | *(rellenar)* | Widgets compactos |
| *(hero)* | `col-span-12` | *(rellenar)* | Variante **Hero** si aplica |

**Persistencia:** posición y tamaño efectivos viven en `userLayout` tras drag; este mapa es la **intención de diseño** inicial para v0 y para auditoría.

---

## 5. Event Bus (sinfonía entre módulos)

**Implementación:** `src/core/EventBus.ts` (`fiferEventBus`).

| Canal (convención) | Emisor típico | Receptor típico |
| :--- | :--- | :--- |
| `module:finance:update` | Módulo Finanzas / bridge | Otros Boxes que dependan de KPIs o ledger |
| `module:content:update` | Pipeline contenido | Ingestor, campañas |
| `module:affiliates:update` | Red afiliados | Finance (ROI cruzado) |
| `fifer:integration:circuit-open` | **Rompecircuitos** al abrir circuito | Telemetría, futuros banners shell |

**Regla:** los módulos **no** importan el estado interno del otro; publican eventos y el suscriptor decide si invalida cache o pide refetch (`router.refresh`, stores).

---

## 6. Rompecircuitos de Box (resiliencia)

**Implementación:** `src/core/CircuitBreaker.ts` · UI: `DiscoveryBox` con `reason="circuit-open"` · integración: `BoxLoader.tsx`.

| Concepto | Comportamiento |
| :--- | :--- |
| Umbral | Tras **3** fallos consecutivos (fetch, JIT v0 o render bajo `BoxErrorBoundary`), el circuito **abre** para ese `boxId`. |
| Aislamiento | Solo ese Box muestra Ghost de rompecircuitos; el grid y los vecinos siguen operativos. |
| Sanar | `onHeal` hace **`boxCircuitBreaker.reset(boxId)`** + remonte del boundary. |
| X-Ray | En dev, `POST /api/dev/fifer-circuit-xray` añade una línea bajo **Auditoría rompecircuitos** en [`_xray_INTEGRATIONS.md`](./_xray_INTEGRATIONS.md). |

---

## 7. Dashboard — mapeo shell → slots

| Ruta / layout | Región | Componentes shell |
| :--- | :--- | :--- |
| `(dashboard)/layout.tsx` | Marco | `AppShell`, sidebar, comandos |
| `PageOrchestrator` | Grid 12 | Orden de slots según `useLayoutStore` + manifiestos |
| Por slot | Celdas | `DraggableBoxWrapper` → **`BoxLoader`** por `boxId` |

Los **boxId** efectivos salen de `box-catalog` + manifiestos del módulo activo (`finance`, `content`, `affiliates`, etc.).

---

## Mantenimiento

- Tras **cada** integración v0 que añada rutas, slots, bus o animaciones: actualizar las secciones **1–7** arriba (aunque sea una fila en la tabla).
- Al ejecutar **`npm run v0-sync`**, el espejo **`v0_pack/13_FRONTEND_BLUEPRINT.md`** debe reflejar este archivo para que v0.dev reciba el blueprint actualizado.

---
*Auditoría X-Ray · Última sincronización: 2026-04-08*
