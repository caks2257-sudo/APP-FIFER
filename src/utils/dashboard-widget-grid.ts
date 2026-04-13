import type { DashboardWidget } from '@/components/dashboard/mockDashboardConfig';

const ALLOWED_COL = [4, 6, 8, 12] as const;

/** Mapea un ancho deseado (1–12) al colSpan permitido por `DashboardWidget`. */
export function normalizeWidgetColSpan(w: number): DashboardWidget['colSpan'] {
  const c = Math.min(12, Math.max(1, Math.round(w)));
  return ALLOWED_COL.reduce((p, x) => (Math.abs(x - c) < Math.abs(p - c) ? x : p));
}
