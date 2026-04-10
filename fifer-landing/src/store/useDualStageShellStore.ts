"use client";

import { create } from "zustand";

/**
 * Snippet de tarea dual-stage por Box — lo consume `BoxLoader` para `buildRefiningMotorComparison`.
 * Sin persistencia; el runtime de refinamiento (API / Commander) puede llamar a `setRefiningTaskForBox`.
 */
type DualStageShellState = {
  taskByBoxId: Record<string, string>;
  setRefiningTaskForBox: (boxId: string, task: string) => void;
  clearRefiningTaskForBox: (boxId: string) => void;
};

export const useDualStageShellStore = create<DualStageShellState>((set) => ({
  taskByBoxId: {},
  setRefiningTaskForBox: (boxId, task) =>
    set((s) => ({
      taskByBoxId: { ...s.taskByBoxId, [boxId]: task },
    })),
  clearRefiningTaskForBox: (boxId) =>
    set((s) => {
      const next = { ...s.taskByBoxId };
      delete next[boxId];
      return { taskByBoxId: next };
    }),
}));
