# Plano Visual - dashboard

## Shell

- Layout de grupo: `src/app/(dashboard)/layout.tsx` — `DashboardLayout` + contenedor `max-w-7xl`.
- Segmento: `layout.tsx` en esta carpeta importa `globals-dashboard.css` y metadata de la vista dashboard.

## Contenido principal

- **Header:** título «Dashboard» y subtítulo analítico (misma copia que el modo sin `children` de `DashboardLayout`).
- **`PageOrchestrator`:** grid DnD de widgets desde `useDashboard` / `DASHBOARD_REFERENCE_WIDGETS`; render vía `componentRegistry`.
