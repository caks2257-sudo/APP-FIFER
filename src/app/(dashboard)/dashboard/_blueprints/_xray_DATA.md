# Plano de Datos - dashboard

## Hook `useDashboard` (`src/hooks/useDashboard.ts`)

- **Fetch:** `GET /api/v1/dashboard`.
- **Adaptación:** `toFiferBoxData` (`dashboardAdapter`) sobre `RawDashboardPayload`.
- **Estado:** widgets base `DASHBOARD_REFERENCE_WIDGETS` + transporte (loading/error/locks) desde `useLayoutStore`.

## API

- **`src/app/api/v1/dashboard/route.ts`:** respuesta JSON consumida por el hub analítico (payload alineado al adaptador).
