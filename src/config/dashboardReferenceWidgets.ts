import type { DashboardWidget } from '@/components/dashboard/mockDashboardConfig';

/** Widgets de referencia para sanidad de layout (alineados al dashboard BDUI por defecto). */
export const DASHBOARD_REFERENCE_WIDGETS: DashboardWidget[] = [
  {
    id: 'flujo-caja-finanzas',
    boxId: 'finance-cashflow-chart',
    module: 'finance',
    colSpan: 12,
    data: {},
  },
  {
    id: 'ingesta-contenido',
    boxId: 'content-ingestion-form',
    module: 'content',
    colSpan: 4,
    data: {},
  },
  {
    id: 'contratos-finance-slot',
    boxId: 'fifer-contratos-main',
    module: 'finance',
    colSpan: 12,
    data: { contratos: [] },
  },
];
