/**
 * Caja Negra — registro de auditoría (trazabilidad UI / finanzas / IA / auth).
 * Persistencia: `localStorage` (`FIFER_AUDIT_LOG_KEY`). Autosanación y depuración post-mortem.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const FIFER_AUDIT_LOG_KEY = "fifer-audit-log";

export type AuditEventType = "UI" | "FINANCE" | "AI" | "AUTH" | "SITE";

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  type: AuditEventType;
  description: string;
  meta?: Record<string, unknown>;
}

const MAX_ENTRIES = 500;

function makeEntryId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

interface AuditState {
  entries: AuditLogEntry[];
}

interface AuditStore extends AuditState {
  /** Añade un evento al final del historial (más reciente primero en lectura típica). */
  append: (type: AuditEventType, description: string, meta?: Record<string, unknown>) => void;
  clear: () => void;
}

export const useAuditStore = create<AuditStore>()(
  persist(
    (set) => ({
      entries: [],

      append: (type, description, meta) => {
        const entry: AuditLogEntry = {
          id: makeEntryId(),
          timestamp: Date.now(),
          type,
          description,
          meta,
        };
        set((s) => ({
          entries: [entry, ...s.entries].slice(0, MAX_ENTRIES),
        }));
      },

      clear: () => set({ entries: [] }),
    }),
    {
      name: FIFER_AUDIT_LOG_KEY,
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        } as unknown as Storage;
      }),
      partialize: (s) => ({ entries: s.entries }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AuditState> | null;
        if (!p || !Array.isArray(p.entries)) return current as AuditStore;
        return {
          ...(current as AuditStore),
          entries: p.entries.slice(0, MAX_ENTRIES),
        };
      },
    }
  )
);

/** API imperativa — usar desde stores/hooks sin suscribirse. */
export function appendAuditLog(
  type: AuditEventType,
  description: string,
  meta?: Record<string, unknown>
): void {
  useAuditStore.getState().append(type, description, meta);
}
