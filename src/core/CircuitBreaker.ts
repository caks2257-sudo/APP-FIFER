import { fiferEventBus, FIFER_EVENT_CHANNELS } from "./EventBus";

export const BOX_CIRCUIT_FAILURE_THRESHOLD = 3;

export type BoxCircuitState = {
  consecutiveFailures: number;
  open: boolean;
  openedAt?: string;
  lastFailureAt?: string;
};

const boxState = new Map<string, BoxCircuitState>();
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}

function getOrCreate(boxId: string): BoxCircuitState {
  let s = boxState.get(boxId);
  if (!s) {
    s = { consecutiveFailures: 0, open: false };
    boxState.set(boxId, s);
  }
  return s;
}

/**
 * Heurística: qué línea de integración documentar cuando un Box abre el circuito.
 * Cursor puede refinar la tabla real en `_xray_INTEGRATIONS.md`.
 */
export function integrationLabelForBox(boxId: string): string {
  const id = boxId.toLowerCase();
  if (id.includes("finance") || id.includes("ledger")) return "Datos financieros / APIs del módulo Finance";
  if (id.includes("shopify") || id.includes("abkupfer")) return "Shopify (ABKupfer) / tienda";
  if (id.includes("ingestor") || id.includes("feed")) return "Ingestor / feeds externos";
  if (id.includes("content") || id.includes("pipeline")) return "Contenido / pipelines IA";
  if (id.includes("affiliate") || id.includes("meli")) return "Afiliados / marketplaces";
  return `Box runtime · ${boxId}`;
}

function requestXrayAuditInDev(boxId: string): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "development") return;
  void fetch("/api/dev/fifer-circuit-xray", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boxId }),
  }).catch(() => {
    /* opcional: servidor apagado */
  });
}

function tryReportCircuitOpen(boxId: string, s: BoxCircuitState): void {
  fiferEventBus.emit(FIFER_EVENT_CHANNELS.CIRCUIT_OPEN, {
    boxId,
    consecutiveFailures: s.consecutiveFailures,
    at: s.openedAt,
  });
  requestXrayAuditInDev(boxId);
}

export const boxCircuitBreaker = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(boxId: string): BoxCircuitState {
    return boxState.get(boxId) ?? { consecutiveFailures: 0, open: false };
  },

  isOpen(boxId: string): boolean {
    return Boolean(boxState.get(boxId)?.open);
  },

  /** Solo limpia racha de fallos cuando el circuito está cerrado; si está abierto, usar `reset` (Sanar). */
  recordSuccess(boxId: string): void {
    const s = getOrCreate(boxId);
    if (s.open) return;
    s.consecutiveFailures = 0;
  },

  /**
   * Registra un fallo de Box (fetch, JIT, render). Tras el umbral, abre el circuito.
   */
  recordFailure(boxId: string): void {
    const s = getOrCreate(boxId);
    if (s.open) return;
    s.consecutiveFailures += 1;
    s.lastFailureAt = new Date().toISOString();
    if (s.consecutiveFailures >= BOX_CIRCUIT_FAILURE_THRESHOLD) {
      s.open = true;
      s.openedAt = s.lastFailureAt;
      notify();
      tryReportCircuitOpen(boxId, s);
    } else {
      notify();
    }
  },

  reset(boxId: string): void {
    boxState.delete(boxId);
    notify();
  },

  /** Tests / diagnóstico */
  _dangerouslyResetAll(): void {
    boxState.clear();
    notify();
  },
};
