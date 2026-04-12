# Plano ROUTING — Finanzas

## Ruta pública

- **Path:** `/finanzas` (Hub Finanzas — visión general; sin redirect a otras rutas).
- **Implementación App Router:** `src/app/(dashboard)/finanzas/page.tsx` (el route group `(dashboard)` no aparece en la URL).
- **Título UI:** «Hub de Finanzas - Visión General».

## Navegación lateral

- En `src/registry/app-registry.ts`, entrada `appRegistry` con `id: 'finanzas'`, `href: '/finanzas'`, resuelta en la Sidebar vía `sidebarNavigationSource` bajo el grupo **«Finanzas»** (`href: '/finanzas'`).
