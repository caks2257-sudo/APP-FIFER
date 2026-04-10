# 00_FIFER_MASTER_BLUEPRINT

> 🤖 ARCHIVO AUTO-GENERADO POR EL SISTEMA FIFER. NO EDITAR MANUALMENTE. Fuente de Verdad: master-blueprint.ts
> Fecha de generación: 2026-04-09T07:03:22.219Z

## SECCIÓN 1: ADN VISUAL & CHASIS

- Deep Navy: `#0A0F1E`
- Electric Yellow: `#EAB308`
- Slate Gray (Text Secondary): `#94A3B8`
- Emerald (Finance Module): `#059669`
- Border Radius: `0.75rem`
- Grid canónico: `12` columnas
- Sidebar: `280px` expandido / `80px` colapsado
- Gap entre cajas: `gap-4`
- Responsiveness: mobile `grid-cols-1`, tablet `grid-cols-6`, desktop `grid-cols-12`
- Z-Index: backdrop `40`, modal `50`, popover `60`
- Glassmorphism (floating): `bg-opacity-10 backdrop-blur-md`
- Border de panel oscuro: `border-white/5`

**Regla de implementación visual:** está estrictamente prohibido usar CSS puro o CSS Modules en UI de producto; se usa Tailwind como estándar del chasis.

## SECCIÓN 2: PROTOCOLO SHELL & DUAL-STAGE AI

- **Hidratación:** JIT desde box-catalog.ts.
- **Interface obligatoria en todos los Boxes:** `data, config, isRefining`.
- **isRefining:** La IA está puliendo el prompt. Mostrar animación de Chispa (Sparkle).
- **isLoading:** Mostrar skeleton screen con color del bioma del módulo.
- **isLocked:** Mostrar JITUpsellBanner.
- **hasError:** Mostrar DiscoveryBox (Modo Sanación).
- **Regla `JITUpsellBanner`:** para usuarios gratuitos que intentan calidad de estudio (`requiresPro=true`), el shell debe mostrar upsell antes de ejecutar flujo premium.

## SECCIÓN 3: MÓDULOS Y BIOMAS

| ID Módulo | Color Primario | Color Acento | Slots disponibles |
|----------|----------------|--------------|-------------------|
| `affiliates` | `#EAB308` | `#2563EB` | `slot-hero`, `slot-stats-grid`, `slot-main-content` |
| `content` | `#1E3A5F` | `#2563EB` | `slot-main`, `slot-gallery` |
| `finance` | `#059669` | `#D97706` | `slot-main`, `slot-stats-grid` |

## SECCIÓN 4: CATÁLOGO DE FIFER BOXES

| Box ID | Módulo Origen | Target Slot | Layout Mínimo | isRefining | requiresPro | hasAIChat |
|--------|---------------|-------------|---------------|------------|-------------|-----------|
| `affiliate-hero-summary` | `affiliates` | `slot-hero` | 6x2 | false | false | true |
| `content-ingestion-form` | `content` | `slot-main` | 6x3 | true | false | true |
| `finance-cashflow-chart` | `finance` | `slot-main` | 6x2 | true | true | true |
