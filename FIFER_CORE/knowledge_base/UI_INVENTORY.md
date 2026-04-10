# UI Inventory - FIFER Dashboard

Registro notarial de componentes UI premium y capacidades vigentes para BDUI.

## Widgets premium activos

### StatCard
- Rol: KPI rapido para estado operativo.
- Capacidades:
  - Titulo y valor principal por props.
  - Indicador de tendencia (`up`/`down`) con detalle.
  - Estado de refinamiento IA con pulso sutil en borde (`isRefining`).

### ChartBox
- Rol: visualizacion analitica de series temporales.
- Capacidades:
  - Titulo, subtitulo y serie de datos por props.
  - Escalado automatico de barras segun maximo de serie.
  - Estado de refinamiento IA con pulso sutil en borde (`isRefining`).

### ActivityBox
- Rol: feed de hitos municipales recientes.
- Capacidades:
  - Lista de items con estado y timestamp por props.
  - Etiquetas de estado normalizadas (`Aprobado`, `En revision`, `Pendiente`).
  - Estado de refinamiento IA con pulso sutil en borde (`isRefining`).

## Data Bridge y adaptacion
- Adaptador activo: `src/utils/adapters/dashboardAdapter.ts`
- Hook orquestador: `src/hooks/useDashboard.ts`
- Funcion de normalizacion: `toFiferBoxData(raw)`
- Catalogo oficial de cajas: `src/registry/box-catalog.ts`
- Armadura de resiliencia: `src/components/core/BoxLoader.tsx`

## Box IDs canonicos activos
- `finance-cashflow-chart` (modulo: finance)
- `content-ingestion-form` (modulo: content)
- `affiliate-hero-summary` (modulo: affiliates)

## Resiliencia BoxLoader
- `isLoading`: renderiza `GhostSkeleton` con color de bioma.
- `hasError`: activa `DiscoveryBox` (modo sanacion) sin romper grilla.
- `isLocked`: activa placeholder de `JITUpsellBanner` (capa PRO).

## Interaccion avanzada (DnD + Commander)
- Orquestador de pagina: `src/components/core/PageOrchestrator.tsx` (dnd-kit core/sortable).
- Envoltorio arrastrable: `src/components/core/DraggableBoxWrapper.tsx` con handle sutil.
- Persistencia de slots: `src/store/useLayoutStore.ts` (Zustand + persist).
- Barra global de comandos: `src/components/core/UICommander.tsx` (Cmd/Ctrl + K, parser inicial `/uf` y `/status`).
- Comandos activos conectados:
  - `/refine all`: activa `isRefining` global por 3s.
  - `/lock finance` y `/unlock finance`: controla estado bloqueado del box `finance-cashflow-chart`.
  - `/hero content`: cambia `content-ingestion-form` a variante hero (`col-span-12`).

## Biomas y colores en tuberia de datos
- Finanzas (Esmeralda): `#10B981`
- Contenido (Azul): `#3B82F6`

Estos tokens se transportan desde el adaptador en `data.biomeColors` y se asocian por widget en `data.widgetBiomes` para consumo de capas superiores sin acoplar UI.
