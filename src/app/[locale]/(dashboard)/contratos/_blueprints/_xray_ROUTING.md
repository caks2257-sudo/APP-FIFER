# Plano ROUTING — Control de Contratos

## Ruta pública

- **Path:** `/contratos`
- **Implementación App Router:** `src/app/(dashboard)/contratos/page.tsx` (el route group `(dashboard)` no aparece en la URL).

## Compatibilidad histórica

- **`/dashboard/contratos`:** `src/app/dashboard/contratos/page.tsx` redirige con `redirect('/contratos')` hacia la ruta canónica del grupo `(dashboard)`.

## Navegación lateral

- En `src/components/dashboard/Sidebar.tsx`, ítem **«Control de Contratos»** con `href: '/contratos'`.
- Anidado bajo el padre **«Finanzas»** (`label: 'Finanzas'`, `href: '/finanzas'`), junto con la app **«Finanzas»** (`/finanzas`).
