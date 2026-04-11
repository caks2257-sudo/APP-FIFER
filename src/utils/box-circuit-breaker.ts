/**
 * Registro central de rompecircuitos por dominio (consumo diagnóstico system-health-monitor).
 */

export type BoxCircuitApi = {
  /** Identificador estable (p.ej. ámbito API o boxId lógico). */
  id: string;
  isOpen: () => boolean;
  reset: () => void;
  /** Acumula fallos hacia el umbral del circuito (opcional). */
  recordFailure?: () => void;
};

const circuits = new Map<string, BoxCircuitApi>();

/** Suscriptores para `useSyncExternalStore` / UI (circuito abierto, sanación, TTL). */
const snapshotListeners = new Set<() => void>();

export function subscribeBoxCircuitSnapshots(onStoreChange: () => void): () => void {
  snapshotListeners.add(onStoreChange);
  return () => snapshotListeners.delete(onStoreChange);
}

/** Notifica a la UI (p. ej. tras TTL o pulso mientras un circuito sigue abierto). */
export function notifyBoxCircuitSnapshotChange(): void {
  for (const cb of Array.from(snapshotListeners)) {
    cb();
  }
}

function bumpSnapshot(): void {
  notifyBoxCircuitSnapshotChange();
}

export function registerBoxCircuit(api: BoxCircuitApi): void {
  circuits.set(api.id, api);
}

function createCountedCircuit(id: string, threshold = 3, openMs = 45_000): BoxCircuitApi {
  let failures = 0;
  let blockedUntil = 0;
  return {
    id,
    recordFailure() {
      failures += 1;
      if (failures >= threshold) {
        blockedUntil = Date.now() + openMs;
      }
    },
    isOpen() {
      const now = Date.now();
      if (now < blockedUntil) return true;
      if (blockedUntil > 0 && now >= blockedUntil) {
        blockedUntil = 0;
        failures = 0;
      }
      return false;
    },
    reset() {
      failures = 0;
      blockedUntil = 0;
    },
  };
}

registerBoxCircuit(createCountedCircuit('fifer-contratos-main'));
registerBoxCircuit(createCountedCircuit('fifer-inmobiliario-main'));
registerBoxCircuit(createCountedCircuit('fifer-misbots-main'));

export const boxCircuitBreaker = {
  /** Circuitos con `isOpen() === true` (IDs registrados). */
  listOpenCircuitIds(): string[] {
    return Array.from(circuits.entries())
      .filter(([, c]) => c.isOpen())
      .map(([circuitId]) => circuitId);
  },

  /** Registra un fallo en el circuito `circuitId` (si existe y expone `recordFailure`). */
  recordFailure(circuitId: string): void {
    circuits.get(circuitId)?.recordFailure?.();
    bumpSnapshot();
  },

  /** `true` si el circuito registrado está abierto (protección activa). */
  isCircuitOpen(circuitId: string): boolean {
    return circuits.get(circuitId)?.isOpen() ?? false;
  },

  /** Limpia racha de fallos y ventana abierta del circuito `circuitId` (Protocolo §0.2). */
  reset(circuitId: string): void {
    circuits.get(circuitId)?.reset();
    bumpSnapshot();
  },

  resetAll(): void {
    for (const c of Array.from(circuits.values())) {
      c.reset();
    }
    bumpSnapshot();
  },
};
