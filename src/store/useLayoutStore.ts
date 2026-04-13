'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DashboardWidget } from '@/components/dashboard/mockDashboardConfig';
import { boxCatalog, type BoxId } from '@/registry/box-catalog';
import { FIFER_BOX_CATALOG_BY_ID } from '@/registry/fifer-box-catalog';
import type { LayoutCommand } from '@/types/layout-command';
import { normalizeWidgetColSpan } from '@/utils/dashboard-widget-grid';
import { applyLayoutSanityForCommander } from '@/utils/layout/commanderLayoutSanity';
import type { DashboardLayoutPersisted } from '@/types/dashboard-layout-persisted';
import { slotOrderFromCells } from '@/utils/dashboard-layout-serialize';

function isBoxId(value: string): value is BoxId {
  return Object.prototype.hasOwnProperty.call(boxCatalog, value);
}

export type GridSpan = { colSpan: number; rowSpan: number };

export type LayoutSyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

type LayoutState = {
  slotOrder: string[];
  /** Overrides de spans en la grilla 12×N (ids de widget). */
  gridSpanByWidgetId: Record<string, GridSpan>;
  /** Widgets añadidos en sesión vía copiloto (sin recarga). */
  liquidAddonWidgets: DashboardWidget[];
  /** Tras GET dashboard: permite debounce de guardado sin pisar hidrato. */
  layoutHydratedFromServer: boolean;
  /** Estado de la última sincronización con Prisma (UX en header). */
  layoutSyncStatus: LayoutSyncStatus;
  lockedByBoxId: Partial<Record<BoxId, boolean>>;
  heroByBoxId: Partial<Record<BoxId, boolean>>;
  isRefineAllActive: boolean;
  setSlotOrder: (order: string[]) => void;
  setLayoutSyncStatus: (status: LayoutSyncStatus) => void;
  markLayoutHydrated: () => void;
  /** Hidrata grilla desde `User.dashboardLayout` (ids conocidos = widgets actuales del API). */
  hydrateDashboardLayoutFromServer: (payload: DashboardLayoutPersisted | null, apiWidgetIds: string[]) => void;
  setGridSpanForWidget: (widgetId: string, span: Partial<GridSpan>) => void;
  addLiquidWidget: (widget: DashboardWidget, span?: Partial<GridSpan>) => void;
  removeLiquidWidget: (widgetId: string) => void;
  applyLayoutCommand: (cmd: LayoutCommand) => void;
  /** Aplica Commander sobre slotOrder vs widgets y persiste orden sin solapes/huérfanos. */
  healUserLayoutSolapes: (widgets: DashboardWidget[]) => void;
  /** `/limpiar-layout`: reconstruye `slotOrder` desde cero con `applyLayoutSanityForCommander` (grid 12). */
  clearLayoutForCommander: (widgets: DashboardWidget[]) => void;
  syncWithWidgets: (widgetIds: string[]) => void;
  setBoxLocked: (boxId: BoxId, locked: boolean) => void;
  setHeroMode: (boxId: BoxId, enabled: boolean) => void;
  triggerRefineAll: (durationMs?: number) => void;
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      slotOrder: [],
      gridSpanByWidgetId: {},
      liquidAddonWidgets: [],
      layoutHydratedFromServer: false,
      layoutSyncStatus: 'idle',
      lockedByBoxId: {},
      heroByBoxId: {},
      isRefineAllActive: false,
      setLayoutSyncStatus: (layoutSyncStatus) => set({ layoutSyncStatus }),
      markLayoutHydrated: () => set({ layoutHydratedFromServer: true }),
      hydrateDashboardLayoutFromServer: (payload, apiWidgetIds) => {
        if (!payload || Object.keys(payload.cells).length === 0) {
          set({ layoutHydratedFromServer: true });
          return;
        }
        const liquidFromPayload = payload.liquidAddonWidgets ?? [];
        const liquidIds = new Set(liquidFromPayload.map((w) => w.id));
        const allowed = new Set([...apiWidgetIds, ...liquidIds]);

        const cells = Object.fromEntries(
          Object.entries(payload.cells).filter(([id]) => allowed.has(id)),
        );

        const baseOrder = payload.slotOrder?.length
          ? payload.slotOrder.filter((id) => allowed.has(id))
          : slotOrderFromCells(cells, apiWidgetIds);

        const mergedOrder = [...baseOrder];
        for (const id of apiWidgetIds) {
          if (!mergedOrder.includes(id)) mergedOrder.push(id);
        }

        const gridSpanByWidgetId: Record<string, GridSpan> = {};
        for (const [id, c] of Object.entries(cells)) {
          gridSpanByWidgetId[id] = { colSpan: c.w, rowSpan: c.h };
        }

        const liquidAddonWidgets = liquidFromPayload.filter((w) => allowed.has(w.id)) as DashboardWidget[];

        set({
          slotOrder: mergedOrder,
          gridSpanByWidgetId,
          liquidAddonWidgets,
          layoutHydratedFromServer: true,
        });
      },
      setSlotOrder: (order) => set({ slotOrder: order }),
      setGridSpanForWidget: (widgetId, span) =>
        set((state) => {
          const prev = state.gridSpanByWidgetId[widgetId] ?? { colSpan: 6, rowSpan: 1 };
          return {
            gridSpanByWidgetId: {
              ...state.gridSpanByWidgetId,
              [widgetId]: {
                colSpan: span.colSpan ?? prev.colSpan,
                rowSpan: span.rowSpan ?? prev.rowSpan,
              },
            },
          };
        }),
      addLiquidWidget: (widget, span) =>
        set((state) => {
          const manifest = FIFER_BOX_CATALOG_BY_ID[widget.boxId];
          const col = normalizeWidgetColSpan(span?.colSpan ?? manifest.defaultDimensions.w);
          const row = span?.rowSpan ?? manifest.defaultDimensions.h;
          const nextSpan: GridSpan = { colSpan: col, rowSpan: row };
          return {
            liquidAddonWidgets: [...state.liquidAddonWidgets, { ...widget, colSpan: col }],
            slotOrder: state.slotOrder.includes(widget.id)
              ? state.slotOrder
              : [...state.slotOrder, widget.id],
            gridSpanByWidgetId: {
              ...state.gridSpanByWidgetId,
              [widget.id]: nextSpan,
            },
          };
        }),
      removeLiquidWidget: (widgetId) =>
        set((state) => {
          const { [widgetId]: _removed, ...restSpans } = state.gridSpanByWidgetId;
          return {
            liquidAddonWidgets: state.liquidAddonWidgets.filter((w) => w.id !== widgetId),
            slotOrder: state.slotOrder.filter((id) => id !== widgetId),
            gridSpanByWidgetId: restSpans,
          };
        }),
      applyLayoutCommand: (cmd) => {
        if (cmd.action === 'add' && cmd.boxId && isBoxId(cmd.boxId)) {
          const boxId = cmd.boxId;
          const id = `liquid-${boxId}-${Date.now().toString(36)}`;
          const widget: DashboardWidget = {
            id,
            boxId,
            module: boxCatalog[boxId].module,
            colSpan: 4,
            data: {},
            config: {},
          };
          get().addLiquidWidget(widget, { colSpan: cmd.colSpan, rowSpan: cmd.rowSpan });
          return;
        }
        if (cmd.action === 'remove' && cmd.widgetId) {
          if (get().liquidAddonWidgets.some((w) => w.id === cmd.widgetId)) {
            get().removeLiquidWidget(cmd.widgetId);
          }
          return;
        }
        if (cmd.action === 'resize' && cmd.widgetId) {
          const prev = get().gridSpanByWidgetId[cmd.widgetId];
          const fromLiquid = get().liquidAddonWidgets.find((w) => w.id === cmd.widgetId);
          const manifest = fromLiquid ? FIFER_BOX_CATALOG_BY_ID[fromLiquid.boxId] : undefined;
          const baseCol = prev?.colSpan ?? fromLiquid?.colSpan ?? 6;
          const baseRow = prev?.rowSpan ?? manifest?.defaultDimensions.h ?? 1;
          get().setGridSpanForWidget(cmd.widgetId, {
            colSpan: cmd.colSpan ?? baseCol,
            rowSpan: cmd.rowSpan ?? baseRow,
          });
        }
      },
      healUserLayoutSolapes: (widgets) => {
        const { slotOrder: next } = applyLayoutSanityForCommander({
          widgets,
          slotOrder: get().slotOrder,
        });
        set({ slotOrder: next });
      },
      clearLayoutForCommander: (widgets) => {
        const { slotOrder: next } = applyLayoutSanityForCommander({
          widgets,
          slotOrder: [],
        });
        set({ slotOrder: next });
      },
      syncWithWidgets: (widgetIds) => {
        const uniqueWidgetIds = Array.from(new Set(widgetIds));
        const current = get().slotOrder;
        if (current.length === 0) {
          set({ slotOrder: uniqueWidgetIds });
          return;
        }

        const kept = Array.from(new Set(current.filter((id) => uniqueWidgetIds.includes(id))));
        const missing = uniqueWidgetIds.filter((id) => !kept.includes(id));
        const next = [...kept, ...missing];
        if (next.join('|') !== current.join('|')) {
          set({ slotOrder: next });
        }
      },
      setBoxLocked: (boxId, locked) =>
        set((state) => ({
          lockedByBoxId: {
            ...state.lockedByBoxId,
            [boxId]: locked,
          },
        })),
      setHeroMode: (boxId, enabled) =>
        set((state) => ({
          heroByBoxId: {
            ...state.heroByBoxId,
            [boxId]: enabled,
          },
        })),
      triggerRefineAll: (durationMs = 3000) => {
        set({ isRefineAllActive: true });
        window.setTimeout(() => set({ isRefineAllActive: false }), durationMs);
      },
    }),
    {
      name: 'fifer-dashboard-layout',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        slotOrder: state.slotOrder,
        gridSpanByWidgetId: state.gridSpanByWidgetId,
        liquidAddonWidgets: state.liquidAddonWidgets,
        lockedByBoxId: state.lockedByBoxId,
        heroByBoxId: state.heroByBoxId,
      }),
    },
  ),
);
