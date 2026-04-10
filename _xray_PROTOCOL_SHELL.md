# FIFER — Protocolo Shell (ADN del sistema)

> **Rol:** Contrato único entre **datos/API**, **shell** (`PageOrchestrator`, `BoxLoader`, layout) y **micro-UI** (Boxes v0).  
> **Chasis global:** [`_xray_v0_MASTER.md`](./_xray_v0_MASTER.md) · **Mapa monorepo:** [`FIFER_XRAY_REPORT.md`](./FIFER_XRAY_REPORT.md).  
> **Identidad por módulo:** `fifer-landing/src/modules/<modulo>/_xray_v0_local.md`.

**Frontend productivo (Next.js App Router):** toda la aplicación web servida al usuario vive **únicamente** bajo **`fifer-landing/src/app/`** (rutas, layouts, API routes del app). No hay otro árbol de páginas equivalente en el monorepo para el panel FIFER.

---

## 1. Estados del Shell

El runtime traduce estado de datos + permisos en lo que ve el usuario. Referencia de implementación: `fifer-landing/src/components/core/BoxLoader.tsx`, `fifer-landing/src/store/useLayoutStore.ts`.

| Estado | Significado | Comportamiento UI típico |
|--------|-------------|----------------------------|
| **idle** | Box montado, sin carga activa | Contenido o placeholder mínimo según `data`. |
| **loading** | Hidratación JIT / fetch en curso | `GhostSkeleton` / skeleton; no crashear el grid. |
| **error** | Fallo de red, 4xx/5xx o throw en render | `DiscoveryBox` (Ghost) o fallback del boundary; **no** tumbar el lienzo completo. |
| **ghost / no-data** | Payload vacío o no renderizable | `DiscoveryBox` (`reason: no-data`); opción de autosanación. |
| **locked** | `isLocked` / BYOK / permisos | Overlay o mensaje; acento según `themeOverrides` / bioma del módulo. |
| **drag-active** | Usuario reordena en grid (`dnd-kit`) | Feedback visual en `DraggableBoxWrapper`; al soltar se persiste orden en `useLayoutStore`. |

Transiciones: **loading → idle | error | ghost**; errores de render capturados por **`BoxErrorBoundary`** con fallback **`DiscoveryBox`**.

---

## 2. SDUI — Metadata y contrato

### 2.1 Superficie `BoxProps`

Implementación: `fifer-landing/src/types/fifer-box.ts`.

| Campo | Rol |
|-------|-----|
| `data` | Negocio o capa normalizada (`fifer-landing/src/utils/adapters/` + barril `adapters.ts`). Entrada única recomendada: **`toFiferBoxData(raw, moduleId, { boxId })`** — Zod por fuente (Shopify, MercadoLibre, Google Ads, catálogo IA / `engine-manifest`) y objeto seguro para el Box. Si el esquema falla de forma crítica, `normalized.meta.ghostMode` → `useFiferData` expone `FiferDataValidationError` y **`DiscoveryBox`** (Modo Sanación) sin crash blanco. **Prohibido** hardcodear datos sensibles en el `.tsx` del Box. |
| `config` | Metadata SDUI opcional: tablas, gráficos, formularios (`BoxUIConfig`). |
| `isLoading` / `error` | Estados explícitos para el shell. |
| `isLocked` | Bloqueo por permisos / BYOK. |
| `isRefining` | **Dual-Stage Pipeline (Etapa 1):** `true` mientras el motor base **refina** el prompt del usuario antes del resultado final. v0 debe mostrar **“Pulido de Prompt”** (animación / estado intermedio) y **no** sustituir aún el mensaje final; al pasar a `false`, mostrar la salida definitiva (y en Pro, opcionalmente encadenar feedback de Etapa 2). |

### 2.2 `BoxUIConfig` (tipos SDUI)

Implementación: `fifer-landing/src/types/ui-schema.ts`.

| Tipo `config.type` | Uso |
|--------------------|-----|
| `table` | `TableConfig` — columnas, acciones. |
| `chart` | `ChartConfig` — series, ejes. |
| `form` | `FormConfig` — campos, submit opcional. |

El backend u orquestador envía **solo metadata**; el Box renderiza según `config` + `data` sin recompilar el artefacto visual por cada cambio de columnas.

### 2.3 Manifiesto `IFiferBoxManifest`

- `boxId`, `sourceModule`, `targetSlot`, `layout` (dimensiones base en grid 12).
- `themeOverrides` → variables CSS en contenedor (`BoxLoader`).
- Layout persistido: `userLayout` / `slotOrder` en Zustand (`fifer-landing/src/store/useLayoutStore.ts`).

---

## 3. Comandos IA (UI Commander)

Capa de órdenes en lenguaje natural / atajos hacia el layout. Implementación: `fifer-landing/src/lib/ui-commander.ts` + `fifer-landing/src/components/core/UICommander.tsx`.

| Orden (concepto) | Efecto en shell |
|------------------|-----------------|
| Expandir / ampliar cajas (vista actual o módulo) | `toggleBoxExpansion` / mutación masiva en `useLayoutStore`. |
| Colapsar todo | Vuelta a spans base desde manifiesto. |
| Mover caja al inicio de slot | Reordenación `reorderBoxInSlot` / `move_to_start` por sujeto textual. |

**Contexto:** `CommanderContext` (`moduleId`, `routePath`) debe alinearse con la ruta activa bajo `fifer-landing/src/app/`.

Parsing: `parseUICommandInput` → comandos tipados; órdenes no reconocidas devuelven mensaje guía sin romper estado.

---

## 4. Piezas runtime (referencia rápida)

| Pieza | Ruta |
|-------|------|
| Carga + tema por bioma | `fifer-landing/src/components/core/BoxLoader.tsx` |
| Aislamiento + Ghost | `fifer-landing/src/components/core/BoxErrorBoundary.tsx`, `DiscoveryBox.tsx` |
| Grid 12 + DnD | `fifer-landing/src/components/core/PageOrchestrator.tsx` |
| Registro JIT v0 | `fifer-landing/src/components/v0-ingestion/registry.ts` |
| Catálogo Boxes | `fifer-landing/src/registry/box-catalog.ts` |
| Módulos / rutas / slots | `fifer-landing/src/modules/**/module.config.ts` |

---

## 5. Autosanación y Ghost Mode

- **Ghost Mode:** datos ausentes, JIT roto o error de fetch → **`DiscoveryBox`** (“Reparar con IA”, “Reconectar Datos”) + `router.refresh` / heal según política.
- **Autosanación:** remontaje con nonce, refresh y límites del **Box** sin reiniciar toda la app.

---

## 6. Enrutamiento

- **Única fuente de rutas de producto:** `fifer-landing/src/app/` (App Router).
- Dashboard modular: `[module]/[...submodule]` + metadata en `module.config.ts` — **prohibido** inventar rutas paralelas fuera de este modelo (ver `.cursorrules` §0).

---

*X-Rays locales por módulo (`_xray_v0_local.md`) refinan paleta y slots; no mezclar identidad visual entre módulos.*
