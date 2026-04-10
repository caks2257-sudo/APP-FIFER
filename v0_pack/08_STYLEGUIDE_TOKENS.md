# FIFER — Libro de reglas de evolución (Styleguide)

> **Audiencia:** Cursor, v0 y cualquier IA que genere apps o Boxes en el ecosistema FIFER.  
> **Objetivo:** Crear **nuevas apps y módulos** sin romper el chasis visual ni el protocolo Box; reutilizar patrones existentes antes de inventar estilos.

---

## 1. Jerarquía de verdad (orden de prioridad)

1. **`_xray_v0_MASTER.md`** — grid 12, protocolo Box, leyes de compatibilidad IA, tokens globales de prompt.  
2. **`[app]/_xray_v0_local.md`** — paleta, slots y Ghost **por aplicación** (no cruzar estilos entre apps).  
3. **Este `docs/styleguide.md`** — consolidación operativa para Cursor: clases Tailwind, variantes, `BoxProps`, reglas de no-duplicación de CSS.  
4. **Código fuente** — `fifer-landing/src/types/fifer-box.ts`, `BoxLoader`, `PageOrchestrator`, `v0-ingestion/`.

Si hay conflicto entre “creatividad” y MASTER, gana **MASTER + local** para estructura y contratos; el local gana en **color/tono** dentro de esa app.

---

## 2. Tokens de color y superficie (referencia unificada)

### 2.0 Leyes extraídas de `_xray_v0_MASTER.md` (chasis global)

| Ley | Valor / regla |
|-----|----------------|
| **Fondo (Deep Navy)** | `#0A0F1E` — lienzo denso, shell oscuro |
| **Acento eléctrico (marca)** | `#EAB308` — Electric Yellow (texto, bordes de acento, highlights) |
| **Bordes** | `border-[#EAB308]/20` (u opacidad equivalente) con **`rounded-[0.75rem]`** (`rounded-xl`) |
| **Grid** | **12 columnas** — `grid-cols-12`; los Boxes usan `col-span-*` según manifiesto / layout, sin `position: absolute` para el slot |

### 2.1 Biomas por módulo (inyección runtime)

El `BoxLoader` resuelve **`--fifer-primary`** y **`--fifer-accent`** según el módulo activo (`src/lib/module-biome.ts`), alineado con los X-Ray locales:

| Módulo | `--fifer-primary` | Notas |
|--------|-------------------|--------|
| **Finanzas** | `#059669` | Esmeralda (confianza) — `src/_xray_v0_local.md` |
| **Contenido** | `#1E3A5F` | Azul editorial — `fifer-content/_xray_v0_local.md` |
| **Afiliados** | `#EAB308` | Yellow Electric — `fifer-landing/_xray_v0_local.md` |

### 2.2 Tabla de tokens (referencia unificada)

| Token / rol | Valor típico | Notas |
|---------------|--------------|--------|
| **Deep Navy** (lienzo Box / fondo denso) | `#0A0F1E` / `bg-deep-navy` / `var(--fifer-deep-navy)` | Alineado con MASTER §IA; también `#0a0f1e` en `:root`. |
| **Electric Yellow** (acento marca) | `#EAB308` | Botones de acento, bordes sutiles, drag activo; `text-electric-yellow`, `border-electric-yellow/20`. |
| **Superficie card / panel** | `#111`, `#18181B` (`fifer-card`), `#0f172a` | UI Commander, paneles oscuros. |
| **Bordes neutros** | `#252525`, `#2a2a2a`, `#1e293b`, `#333` | Separadores y controles secundarios. |
| **Texto primario** | `#e4e4e7`, `#f4f4f5`, `#f8fafc` | Cuerpo y títulos sobre oscuro. |
| **Texto secundario** | `#9ca3af`, `#a1a1aa`, `#64748b` | Labels, hints. |
| **Error** | `#ef4444`, fondos `#2b1113` / `#7f1d1d` (toast error) | Solo estados de error; no como marca. |

**Tailwind (`tailwind.config.ts`):** `deep-navy`, `electric-yellow`, `fifer-dark`, `fifer-yellow`, `fifer-card`, `fifer-navy`, `dashboard-*`, etc. Preferir **tokens del theme** antes de hex arbitrarios.

---

## 3. Tipografía

| Uso | Regla |
|-----|--------|
| Títulos / jerarquía fuerte | **Montserrat** o **Manrope** (ya usados en `globals.css` para headings), peso **bold** en H1–H2. |
| Cuerpo | **Source Sans 3** (base `body`), **Open Sans** / sans equivalente según MASTER. |
| UI densa / Box | **Inter** o **Geist**, **semibold** en títulos de card (MASTER §IA). |

En artefactos **v0**: solo **`className` con utilidades Tailwind**; sin fuentes embebidas ni CSS externo en el archivo del Box (MASTER §II).

---

## 4. Grid, espaciado y radios (patrones extraídos del código)

### 4.1 Grid obligatorio

- Lienzo principal: **`grid-cols-12`** (MASTER).  
- Slots: los Boxes usan **`col-span-*`** según manifiesto (`layout.minWidth`); **prohibido** usar `position: absolute` para colocar el slot en el lienzo.  
- Orquestación actual (`PageOrchestrator`): `repeat(12, minmax(0, 1fr))`, **`gap: 12`** (12px) entre celdas.

### 4.2 Espaciado recurrente

| Contexto | Valor observado |
|----------|-----------------|
| Padding contenedor principal dashboard | `24` px (`padding: 24`) |
| Padding card / sección Box | `12` px |
| Gap flex (toolbar Box, drag handle) | `8` px |
| Gap grid slots | `12` px |
| Padding vacío / mensaje | `14` px |

En Tailwind: preferir `p-3`, `p-6`, `gap-2`, `gap-3`, `gap-4` alineados a 8/12/16/24px.

### 4.3 Border radius

| Elemento | Radio |
|----------|--------|
| MASTER (prompt v0) | `rounded-[0.75rem]` (12px) |
| Cards Box / Discovery Ghost | `12px`–`14px` (`rounded-xl` / `rounded-[0.75rem]`) |
| Botones secundarios | `8px` (`rounded-lg`) |
| Chips / pill (ej. comando flotante) | `999` (full pill) |
| Skeleton Ghost | `0.75rem` + borde `Electric Yellow` ~20% opacidad |

---

## 5. Variantes de densidad: Mini · Standard · Hero

Estas variantes alinean **UI** con el **layout persistido** (`useLayoutStore`: expansión “Hero” = más columnas/filas).

| Variante | Grid (orientativo) | Comportamiento UI |
|----------|---------------------|-------------------|
| **Mini** | `col-span-3` · `col-span-4` | Vista compacta: menos padding interno (`p-2`/`p-3`), tipografía `text-sm`, una métrica o lista corta. Altura mínima baja. |
| **Standard** | `col-span-4` · `col-span-6` | Densidad por defecto; `p-3`/`p-4`, jerarquía completa legible. |
| **Hero** | `col-span-12` (o span máximo del slot) | Impacto: KPIs grandes, gráfico principal o tabla ancha; `p-4`/`p-6`, títulos `text-lg`/`text-xl`, más aire vertical. En runtime coincide con expansión tipo “Hero” del layout (12 cols × filas ampliadas). |

Los Boxes deben **responder** a `data` + tamaño de slot sin romper el grid; no fijar anchos en px que contradigan `col-span-*`.

---

## 6. Contrato obligatorio: `BoxProps`

Todo componente colocado en **`v0-ingestion/`** y cargado vía **`BoxLoader`** debe ser compatible con:

```ts
// Resumen — ver `src/types/fifer-box.ts` y `src/types/ui-schema.ts`
interface BoxProps {
  data?: any;           // SIEMPRE vía adaptadores (`src/utils/adapters.ts`) cuando la fuente no sea local
  config?: BoxUIConfig | any;  // SDUI opcional
  isLoading?: boolean;
  error?: Error | null;
  isLocked?: boolean;
}
```

**Reglas:**

1. **No hardcodear datos de negocio** en el `.tsx` del Box; usar `data` inyectada (JIT / API / adaptador).  
2. **Sin `fetch` dentro del Box** salvo instrucción explícita de arquitectura.  
3. **`data` indefinido / vacío:** el Box debe degradar con skeleton o vacío seguro; **`BoxLoader`** puede mostrar Ghost Mode (`DiscoveryBox`) si corresponde.  
4. **`config` (SDUI):** tablas, charts y forms deben respetar `BoxUIConfig` cuando el backend orqueste UI.

---

## 7. Clases Tailwind de referencia (recetas)

**Lienzo / card oscuro**

```txt
bg-[#0A0F1E] o bg-deep-navy
border border-[#EAB308]/20 rounded-[0.75rem]
text-zinc-100
```

**Acento acción**

```txt
text-[#EAB308] o text-electric-yellow
border-[#EAB308]/30 hover:border-[#EAB308]/50
```

**Ghost / skeleton (shimmer)**

- Clase global existente: **`fifer-ghost-skeleton`** (animación en `globals.css`); gradiente lineal oscuro + borde amarillo suave en componentes, no duplicar `@keyframes` en nuevos CSS.

---

## 8. Cómo construir un **módulo nuevo** (checklist)

1. Añadir **`module.config.ts`** con `id`, `nombre`, `icono`, `routes[]` y **`slots`** (`SlotDictionary`).  
2. Registrar **boxIds** en **`src/registry/box-catalog.ts`** con capacidades (`hasAIChat`, `isResizable`, fuentes de datos).  
3. Cada Box: **un archivo `.tsx`** en `v0-ingestion/boxes/` + entrada en **`V0_BOX_LOADERS`** (`registry.ts`).  
4. Manifiestos JSON / `IFiferBoxManifest` alineados con `layout.minWidth` / `minHeight`.  
5. Datos: crear **adaptador** en `src/utils/adapters.ts` si la fuente es nueva (Shopify, AliExpress, etc.).  
6. Probar **grid 12**, variantes Mini|Standard|Hero y estados loading/error sin crashear el lienzo.

---

## 9. Meta-instrucción para Cursor (anti-deuda CSS)

**Regla obligatoria:** cualquier componente nuevo generado por Cursor debe **heredar** las clases y tokens de este styleguide y de `_xray_v0_MASTER.md` (Deep Navy `#0A0F1E`, Electric Yellow `#EAB308`, bordes `rounded-xl` / `rounded-[0.75rem]`, grid 12 columnas, variables `--fifer-primary` / `--fifer-accent` por bioma). **No inventar** paletas, radios ni layouts paralelos fuera de estos contratos.

**PROHIBIDO** crear hojas de estilo nuevas, CSS Modules, styled-components o bloques `<style>` **solo para un Box o módulo**, si el mismo resultado puede lograrse con:

1. **Utilidades Tailwind** en `className` (MASTER §II), y  
2. **Tokens existentes** (`globals.css` `:root`, clases como **`.fifer-ghost-skeleton`**), y  
3. **Patrones ya presentes** en `src/components/v0-ingestion/` y **`fifer-theme.ts`** (`FIFER_ELECTRIC_YELLOW`, springs compartidos).

**Excepción:** archivos **globales** acordados en PR (p.ej. un nuevo keyframe en `globals.css` **reutilizable** en todo FIFER), nunca CSS one-off paralelo al sistema Box.

---

## 10. Validación de ADN (comparación obligatoria para IA)

Antes de dar por cerrada cualquier generación o refactor de UI en `fifer-landing`, la IA **debe** contrastar el resultado con **este archivo** y con **`_xray_v0_MASTER.md`**. Objetivo: ADN visual **inmaculado** en lo global (módulos pueden añadir bioma vía `--fifer-primary` / local X-Ray).

| Comprobación | Criterio |
|--------------|----------|
| Fondo / lienzo | Deep Navy `#0A0F1E` donde el MASTER exige lienzo denso; no sustituir por grises arbitrarios sin X-Ray local. |
| Marca / acento | Electric Yellow `#EAB308` para acentos de marca y bordes sutiles (`/20`–`/30` opacidad) salvo bioma documentado. |
| Forma | `rounded-xl` / `rounded-[0.75rem]` en cards y contenedores Box. |
| Layout | Grid **12 columnas**; sin `position: absolute` para slots del dashboard. |
| Tokens | Preferir `globals.css` / `tailwind.config` / variables `--fifer-*` antes de hex sueltos. |

Si el diff no cumple la tabla, **corregir** o documentar la excepción en el **X-Ray local** del módulo y enlazar en `FIFER_XRAY_REPORT.md` cuando el alcance sea global.

**Runtime:** `BoxLoader` expone `data-fifer-catalog-gap="true"` cuando el `boxId` no está en `box-catalog.ts`; el panel **`CatalogGapBanner`** se muestra en **desarrollo** (o si `NEXT_PUBLIC_FIFER_SHOW_CATALOG_GAP=1`). En producción, revisar la consola para el mismo aviso.

---

## 11. Enlaces rápidos

| Recurso | Ruta |
|---------|------|
| Contrato Box / manifiesto | `fifer-landing/src/types/fifer-box.ts` |
| SDUI | `fifer-landing/src/types/ui-schema.ts` |
| Adaptadores datos | `fifer-landing/src/utils/adapters.ts` |
| Catálogo Box | `fifer-landing/src/registry/box-catalog.ts` |
| Registro JIT v0 | `fifer-landing/src/components/v0-ingestion/registry.ts` |
| Orquestador | `fifer-landing/src/components/core/PageOrchestrator.tsx` |
| X-Ray MASTER | `_xray_v0_MASTER.md` (raíz del repo) |
| Catálogo gap (runtime) | `data-fifer-catalog-gap` en `BoxLoader` + `CatalogGapBanner.tsx` |

---

*Última alineación: tokens y valores tomados de `_xray_v0_MASTER.md`, `globals.css`, `tailwind.config.ts` y componentes core (`BoxLoader`, `DiscoveryBox`, `DraggableBoxWrapper`, `PageOrchestrator`, `UICommander`).*
