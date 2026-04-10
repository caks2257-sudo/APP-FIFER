import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Acciones encolables sin red (obras Chicureo, inventario ABKupfer, etc.). */
export type OfflineActionKind = "SITE_NOTE" | "STOCK_CHANGE" | string;

export interface OfflineQueuedAction {
  id: string;
  kind: OfflineActionKind;
  /** Ej.: "Nueva nota en Obra Valle Norte" */
  label: string;
  payload?: Record<string, unknown>;
  createdAt: number;
}

interface OfflineStoreState {
  queue: OfflineQueuedAction[];
}

interface OfflineStore extends OfflineStoreState {
  enqueue: (
    action: Omit<OfflineQueuedAction, "id" | "createdAt"> & { id?: string }
  ) => string;
  /** Elimina por id (p. ej. tras sync parcial). */
  removeByIds: (ids: string[]) => void;
  clearQueue: () => void;
}

const genId = () =>
  `offline_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set) => ({
      queue: [],

      enqueue: (action) => {
        const id = action.id ?? genId();
        const item: OfflineQueuedAction = {
          id,
          kind: action.kind,
          label: action.label,
          payload: action.payload,
          createdAt: Date.now(),
        };
        set((s) => ({ queue: [...s.queue, item] }));
        return id;
      },

      removeByIds: (ids) => {
        const drop = new Set(ids);
        set((s) => ({ queue: s.queue.filter((q) => !drop.has(q.id)) }));
      },

      clearQueue: () => set({ queue: [] }),
    }),
    {
      name: "fifer-offline-queue",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ queue: s.queue }),
    }
  )
);
