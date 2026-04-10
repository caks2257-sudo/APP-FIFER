/**
 * Bus de eventos global (pub/sub) para desacoplar módulos del monorepo y del shell Next.
 * Ej.: Finanzas `emit("module:finance:update")` → Contenido `on(...)` sin import cruzado.
 */
export type FiferEventHandler<T = unknown> = (payload: T) => void;

const channels = new Map<string, Set<FiferEventHandler>>();

/** Aísla canales por `user_id` (evita colisiones entre tenants en el mismo runtime). */
export function resolveFiferEventChannel(channel: string, namespace?: string): string {
  if (namespace === undefined || namespace === null) return channel;
  const trimmed = String(namespace).trim();
  if (trimmed === "") return channel;
  const safe = trimmed.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `ns:${safe}:${channel}`;
}

function getSet(channel: string): Set<FiferEventHandler> {
  let set = channels.get(channel);
  if (!set) {
    set = new Set();
    channels.set(channel, set);
  }
  return set;
}

export type FiferEventBusOptions = {
  /** Namespace típico: `user_id` del espacio aislado. Sin namespace, comportamiento global (retrocompatible). */
  namespace?: string;
};

export const fiferEventBus = {
  /**
   * Publica un evento a todos los suscriptores del canal (síncrono).
   */
  emit<T = unknown>(channel: string, payload?: T, options?: FiferEventBusOptions): void {
    const resolved = resolveFiferEventChannel(channel, options?.namespace);
    const set = channels.get(resolved);
    if (!set || set.size === 0) return;
    set.forEach((h) => {
      try {
        h(payload as T);
      } catch (e) {
        console.error(`[FiferEventBus] handler error on "${resolved}":`, e);
      }
    });
  },

  /**
   * Suscripción; devuelve función de baja.
   */
  on<T = unknown>(channel: string, handler: FiferEventHandler<T>, options?: FiferEventBusOptions): () => void {
    const resolved = resolveFiferEventChannel(channel, options?.namespace);
    const set = getSet(resolved);
    const wrapped = handler as FiferEventHandler;
    set.add(wrapped);
    return () => {
      set.delete(wrapped);
      if (set.size === 0) channels.delete(resolved);
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
