# 05_UI_INVENTORY

Inventario técnico de componentes en `fifer-landing/src/components/v0-ingestion/` para promover reutilización en v0.dev.

## Componentes `.tsx` detectados

### 1) `boxes/fifer-content-pipeline.tsx`
- **Archivo:** `fifer-content-pipeline.tsx`
- **Componente exportado:** `FiferContentPipelineBox` (default)
- **Propósito visual:** Caja editorial con lista de borradores, acciones de `Enviar`/`Quitar`, animaciones de entrada/salida y estado de carga.
- **Props que acepta:** `BoxProps`
  - Usa explícitamente: `data`, `isLoading`, `boxId`.
  - Campos leídos desde `data`: `title` (string opcional), `drafts` (array opcional con `id`, `title`, `status`).

### 2) `boxes/fifer-vision-slot.tsx`
- **Archivo:** `fifer-vision-slot.tsx`
- **Componente exportado:** `FiferVisionSlotBox` (default)
- **Propósito visual:** Dropzone para imagen (drag/click/paste), preview, análisis OCR vía `/api/vision/analyze` y botones de acciones sugeridas.
- **Props que acepta:** `BoxProps`
  - Usa explícitamente: `boxId`, `isLoading`.
  - `data` no se consume en este componente.

### 3) `boxes/affiliate-slot-shell.tsx`
- **Archivo:** `affiliate-slot-shell.tsx`
- **Componente exportado:** `AffiliateSlotShell` (default)
- **Propósito visual:** Placeholder invisible (`sr-only`) para boxes de afiliados aún sin UI dedicada; mantiene compatibilidad de render JIT.
- **Props que acepta:** `BoxProps`
  - Usa explícitamente: `boxId`.
  - `data`, `isLoading` no se consumen.

### 4) `boxes/fifer-finance-snapshot.tsx`
- **Archivo:** `fifer-finance-snapshot.tsx`
- **Componente exportado:** `FiferFinanceSnapshotBox` (default)
- **Propósito visual:** Snapshot financiero con estado de presupuesto (`Pendiente/Aprobado`), botón de confirmación y feedback optimista.
- **Props que acepta:** `BoxProps`
  - Usa explícitamente: `data`, `isLoading`, `boxId`.
  - Campos leídos desde `data`: `title` (string opcional).

### 5) `boxes/fifer-ingestor-feed.tsx`
- **Archivo:** `fifer-ingestor-feed.tsx`
- **Componente exportado:** `FiferIngestorFeedBox` (default)
- **Propósito visual:** Feed compacto de ingesta con filas archivables, animaciones (`AnimatePresence`) y rollback si falla persistencia.
- **Props que acepta:** `BoxProps`
  - Usa explícitamente: `data`, `isLoading`, `boxId`.
  - Campos leídos desde `data`: `title` (string opcional).

### 6) `boxes/finance-uf-card.tsx`
- **Archivo:** `finance-uf-card.tsx`
- **Componente exportado:** `FinanceUfCard` (default)
- **Propósito visual:** Tarjeta financiera minimalista para mostrar el indicador UF con bioma Finance (borde verde) y valor destacado en Electric Yellow.
- **Props que acepta:** `BoxProps`
  - Usa explícitamente: `isRefining`.
  - Comportamiento: cuando `isRefining=true`, muestra estado "Pulido de prompt en curso..."; cuando `false`, muestra valor hardcoded `$37.850,42`.

### 7) `ScrapingUrlBox.tsx`
- **Archivo:** `ScrapingUrlBox.tsx`
- **Componente exportado:** `ScrapingUrlBox` (default)
- **Propósito visual:** Box operativo para scraping por URL; ejecuta `engine.run("scraping", { url, targetModule: "content" })`, muestra estado "Pulido de Prompt" y renderiza salida como `DataNode` arrastrables (titulo, descripcion y tags).
- **Props que acepta:** `BoxProps`
  - Usa explícitamente: `engine`, `isRefining`, `data`.
  - Comportamiento: estado dual-stage durante refinamiento y fallback visual si no hay resultados; cada chip publica payload en `application/fifer-node` para Drag & Drop nativo.

### 8) `core/DataNode.tsx`
- **Archivo:** `src/components/core/DataNode.tsx`
- **Componente exportado:** `DataNode` (default)
- **Propósito visual:** Pildora/chip glass oscuro arrastrable para representar entidades extraidas y transferirlas entre boxes.
- **Props que acepta:** `{ id, type, label, value }`
  - Usa explícitamente: `draggable`, `onDragStart`, `onDragEnd`.
  - Comportamiento: serializa `{ id, type, label, value }` y lo publica con `dataTransfer.setData("application/fifer-node", payload)`.

## Mapa de reutilización actual (JIT loader)

Definido en `v0-ingestion/registry.ts`:

- `fifer-finance-snapshot` -> `fifer-finance-snapshot.tsx`
- `fifer-content-pipeline` -> `fifer-content-pipeline.tsx`
- `content-google-shopping` -> `fifer-content-pipeline.tsx` (reuso directo)
- `fifer-ingestor-feed` -> `fifer-ingestor-feed.tsx`
- `fifer-vision-slot` -> `fifer-vision-slot.tsx`
- `affiliate-hero-summary` -> `affiliate-slot-shell.tsx`
- `affiliate-kpi-grid` -> `affiliate-slot-shell.tsx`
- `affiliate-offers-table` -> `affiliate-slot-shell.tsx`
- `scraping-url-box` -> `ScrapingUrlBox.tsx`

## Contrato de props base

Todos los componentes del inventario reciben `BoxProps` desde `@/types/fifer-box`.  
En la práctica, los campos más usados por esta librería son:

- `boxId: string`
- `isLoading?: boolean`
- `isRefining?: boolean`
- `data?: unknown` (con lecturas defensivas de campos opcionales como `title` y `drafts`)

## Componentes Core Shell agregados

### `src/components/core/LivingCommandBar.tsx`
- **Componente exportado:** `LivingCommandBar`
- **Propósito visual:** barra de comandos flotante `Cmd+K` con glassmorphism sobre Deep Navy para órdenes del protocolo shell.
- **Integración principal:** `src/app/(dashboard)/layout.tsx`.
- **Comandos base sugeridos:** `/uf`, `/status`, `/stock`, `expandir todo`, `colapsar todo`.

### `src/components/core/DashboardStatsRail.tsx`
- **Componente exportado:** `DashboardStatsRail`
- **Propósito visual:** carril lateral JIT para `slot-stats-grid`, alimentado por `PageOrchestrator` + `module.config.ts`.
- **Integración principal:** `src/app/(dashboard)/layout.tsx`.
- **BoxIds de fallback por módulo:** `finance-cashflow-chart`, `asset-gallery`, `content-google-shopping`, `affiliate-kpi-grid`.
