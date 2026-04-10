'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BoxId } from '@/registry/box-catalog';

type LayoutState = {
  slotOrder: string[];
  lockedByBoxId: Partial<Record<BoxId, boolean>>;
  heroByBoxId: Partial<Record<BoxId, boolean>>;
  isRefineAllActive: boolean;
  setSlotOrder: (order: string[]) => void;
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
      syncWithWidgets: (widgetIds) => {
        const current = get().slotOrder;
        if (current.length === 0) {
          set({ slotOrder: widgetIds });
          return;
        }

        const kept = current.filter((id) => widgetIds.includes(id));
        const missing = widgetIds.filter((id) => !kept.includes(id));
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
