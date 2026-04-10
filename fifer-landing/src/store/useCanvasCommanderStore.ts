import { create } from "zustand";

/** Entradas indexadas para búsqueda global (LivingCommandBar). */
export type CanvasNodeSearchEntry = {
  id: string;
  label: string;
  type: string;
  /** Texto aplanado (label, tipo, valor). */
  haystack: string;
};

type CanvasCommanderState = {
  entries: CanvasNodeSearchEntry[];
  /** El Commander solicita foco en el lienzo (scroll + resaltado). */
  pendingFocusNodeId: string | null;
  setCanvasSearchIndex: (entries: CanvasNodeSearchEntry[]) => void;
  requestCanvasNodeFocus: (nodeId: string) => void;
  clearPendingCanvasFocus: () => void;
};

export const useCanvasCommanderStore = create<CanvasCommanderState>((set) => ({
  entries: [],
  pendingFocusNodeId: null,

  setCanvasSearchIndex: (entries) => set({ entries }),

  requestCanvasNodeFocus: (nodeId) => set({ pendingFocusNodeId: nodeId }),

  clearPendingCanvasFocus: () => set({ pendingFocusNodeId: null }),
}));
