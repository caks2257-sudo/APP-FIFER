# Plano de Enrutamiento - dashboard (hub analítico)

## Rutas

- **Ruta pública Next.js:** `/dashboard` — `src/app/(dashboard)/dashboard/page.tsx` (grupo `(dashboard)`; layout compartido con Sidebar/Topbar).
- **Redirección legado:** `/dashboard/contratos` → `/contratos` (`dashboard/contratos/page.tsx`).
- **Navegación:** ítem **Dashboard** en `src/registry/app-registry.ts` (`href: '/dashboard'`).
