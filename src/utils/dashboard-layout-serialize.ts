import type { DashboardWidget } from '@/components/dashboard/mockDashboardConfig';
import type { DashboardLayoutPersisted, LayoutCell } from '@/types/dashboard-layout-persisted';
import { FIFER_BOX_CATALOG_BY_ID } from '@/registry/fifer-box-catalog';

type GridSpan = { colSpan: number; rowSpan: number };

export type LayoutSliceForPersist = {
  slotOrder: string[];
  gridSpanByWidgetId: Record<string, GridSpan>;
  liquidAddonWidgets: DashboardWidget[];
};

function resolveSpanForWidget(
  widgetId: string,
  slice: LayoutSliceForPersist,
  widgetColSpanFallback?: number,
): GridSpan {
  const o = slice.gridSpanByWidgetId[widgetId];
  if (o) return o;
  const liquid = slice.liquidAddonWidgets.find((w) => w.id === widgetId);
  if (liquid) {
    const m = FIFER_BOX_CATALOG_BY_ID[liquid.boxId];
    return {
      colSpan: liquid.colSpan,
      rowSpan: m.defaultDimensions.h,
    };
  }
  const fb = widgetColSpanFallback ?? 6;
  return { colSpan: fb, rowSpan: 1 };
}

/** Construye payload persistible a partir del store (orden + spans + líquidos). */
export function buildDashboardLayoutPayload(slice: LayoutSliceForPersist): DashboardLayoutPersisted {
  const cells: Record<string, LayoutCell> = {};
  const seen = new Set<string>();

  slice.slotOrder.forEach((id, index) => {
    seen.add(id);
    const span = resolveSpanForWidget(id, slice);
    cells[id] = { x: index, y: 0, w: span.colSpan, h: span.rowSpan };
  });

  for (const id of Object.keys(slice.gridSpanByWidgetId)) {
    if (seen.has(id)) continue;
    const span = slice.gridSpanByWidgetId[id];
    cells[id] = {
      x: slice.slotOrder.length,
      y: 0,
      w: span.colSpan,
      h: span.rowSpan,
    };
  }

  return {
    cells,
    slotOrder: [...slice.slotOrder],
    liquidAddonWidgets: slice.liquidAddonWidgets.map((w) => ({
      id: w.id,
      boxId: w.boxId,
      module: w.module,
      colSpan: w.colSpan,
      data: w.data,
      config: w.config,
      state: w.state,
    })),
  };
}

export function serializeDashboardLayoutPayload(payload: DashboardLayoutPersisted): string {
  const sortedCells = Object.keys(payload.cells)
    .sort()
    .reduce<Record<string, LayoutCell>>((acc, k) => {
      acc[k] = payload.cells[k];
      return acc;
    }, {});
  return JSON.stringify({
    cells: sortedCells,
    slotOrder: payload.slotOrder,
    liquidAddonWidgets: payload.liquidAddonWidgets,
  });
}

/** Orden estable derivado de celdas si falta slotOrder. */
export function slotOrderFromCells(
  cells: Record<string, LayoutCell>,
  fallbackIds: string[],
): string[] {
  const entries = Object.entries(cells);
  if (entries.length === 0) return fallbackIds;
  const sorted = entries.sort((a, b) => {
    const ay = a[1].y - b[1].y;
    if (ay !== 0) return ay;
    const ax = a[1].x - b[1].x;
    if (ax !== 0) return ax;
    return a[0].localeCompare(b[0]);
  });
  return sorted.map(([id]) => id);
}
