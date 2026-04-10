/**
 * Dispatcher global de alertas FIFER (Conscious Notification System).
 * UI: `FiferAlertHost` — niveles INFO / WARNING / IA_INSIGHT.
 */
import { create } from "zustand";
import { appendAuditLog } from "@/store/useAuditStore";
import type { FiferAlertLevel } from "@/types/fifer-alert";

export interface FiferAlertItem {
  id: string;
  level: FiferAlertLevel;
  title: string;
  body?: string;
  createdAt: number;
  actionLabel?: string;
  onAction?: () => void;
  /** Dedupe p. ej. `integration:mercadolibre` */
  sourceKey?: string;
}

const genId = () => `fifer_alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

interface AlertStoreState {
  alerts: FiferAlertItem[];
  /** IDs de `sourceKey` ya disparados en esta sesión (evita spam). */
  sessionDispatchedKeys: Set<string>;
}

interface AlertStore extends AlertStoreState {
  dispatch: (a: Omit<FiferAlertItem, "id" | "createdAt"> & { id?: string }) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
  markSessionDispatched: (sourceKey: string) => void;
  hasSessionDispatched: (sourceKey: string) => boolean;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [],
  sessionDispatchedKeys: new Set<string>(),

  dispatch: (payload) => {
    const id = payload.id ?? genId();
    const item: FiferAlertItem = {
      id,
      level: payload.level,
      title: payload.title,
      body: payload.body,
      actionLabel: payload.actionLabel,
      onAction: payload.onAction,
      sourceKey: payload.sourceKey,
      createdAt: Date.now(),
    };
    appendAuditLog(
      "AI",
      `[Conscious Alerts] ${payload.level}: ${payload.title}`,
      {
        alertId: id,
        level: payload.level,
        sourceKey: payload.sourceKey,
        hasBody: Boolean(payload.body),
      }
    );
    set((s) => ({ alerts: [item, ...s.alerts].slice(0, 50) }));
    return id;
  },

  dismiss: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

  clearAll: () => set({ alerts: [] }),

  markSessionDispatched: (sourceKey) =>
    set((s) => {
      const next = new Set(s.sessionDispatchedKeys);
      next.add(sourceKey);
      return { sessionDispatchedKeys: next };
    }),

  hasSessionDispatched: (sourceKey) => get().sessionDispatchedKeys.has(sourceKey),
}));

/** API imperativa desde cualquier módulo (sin hook). */
export function dispatchFiferAlert(
  payload: Omit<FiferAlertItem, "id" | "createdAt"> & { id?: string }
): string {
  return useAlertStore.getState().dispatch(payload);
}

export function dismissFiferAlert(id: string): void {
  useAlertStore.getState().dismiss(id);
}
