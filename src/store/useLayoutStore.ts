'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DashboardWidget } from '@/components/dashboard/mockDashboardConfig';
import type { BoxId } from '@/registry/box-catalog';
import { applyLayoutSanityForCommander } from '@/utils/layout/commanderLayoutSanity';

type LayoutState = {
  slotOrder: string[];
  lockedByBoxId: Partial<Record<BoxId, boolean>>;
  heroByBoxId: Partial<Record<BoxId, boolean>>;
  isRefineAllActive: boolean;
  setSlotOrder: (order: string[]) => void;
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
      lockedByBoxId: {},
      heroByBoxId: {},
      isRefineAllActive: false,
      setSlotOrder: (order) => set({ slotOrder: order }),
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
    },
  ),
);
