/**
 * Bus de eventos global (pub/sub) para desacoplar módulos del monorepo y del shell Next.
 * Ej.: Finanzas `emit("module:finance:update")` → Contenido `on(...)` sin import cruzado.
 */
export type FiferEventHandler<T = unknown> = (payload: T) => void;

const channels = new Map<string, Set<FiferEventHandler>>();

function getSet(channel: string): Set<FiferEventHandler> {
  let set = channels.get(channel);
  if (!set) {
    set = new Set();
    channels.set(channel, set);
  }
  return set;
}

export const fiferEventBus = {
  /**
   * Publica un evento a todos los suscriptores del canal (síncrono).
   */
  emit<T = unknown>(channel: string, payload?: T): void {
    const set = channels.get(channel);
    if (!set || set.size === 0) return;
    set.forEach((h) => {
      try {
        h(payload as T);
      } catch (e) {
        console.error(`[FiferEventBus] handler error on "${channel}":`, e);
      }
    });
  },

  /**
   * Suscripción; devuelve función de baja.
   */
  on<T = unknown>(channel: string, handler: FiferEventHandler<T>): () => void {
    const set = getSet(channel);
    const wrapped = handler as FiferEventHandler;
    set.add(wrapped);
    return () => {
      set.delete(wrapped);
      if (set.size === 0) channels.delete(channel);
    };
  },

  /** Canales activos (debug / telemetría). */
  channelNames(): string[] {
    return Array.from(channels.keys());
  },

  /** Limpia todos los suscriptores (tests o hot reload controlado). */
  clearAll(): void {
    channels.clear();
  },
};

/** Canales sugeridos (convención; no cerrados en tipos para flexibilidad). */
export const FIFER_EVENT_CHANNELS = {
  FINANCE_UPDATE: "module:finance:update",
  CONTENT_UPDATE: "module:content:update",
  AFFILIATES_UPDATE: "module:affiliates:update",
  INGESTOR_UPDATE: "module:ingestor:update",
  CIRCUIT_OPEN: "fifer:integration:circuit-open",
} as const;
