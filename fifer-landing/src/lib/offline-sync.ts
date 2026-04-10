import { dispatchFiferAlert } from "@/store/useAlertStore";
import { appendAuditLog } from "@/store/useAuditStore";
import {
  useOfflineStore,
  type OfflineQueuedAction,
} from "@/store/useOfflineStore";
import { applyOfflineActionToSyncMock } from "@/mocks/site-mode-sync-mock";

let syncInFlight = false;

/**
 * Envía cada acción al mock + Caja Negra (audit), luego vacía la cola.
 * Al terminar, alerta "Datos Sincronizados".
 */
export async function syncOfflineQueue(): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (syncInFlight) return 0;

  const snapshot = [...useOfflineStore.getState().queue];
  if (snapshot.length === 0) return 0;

  syncInFlight = true;
  try {
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 250));

    for (const action of snapshot) {
      await pushOfflineActionToLogsAndMocks(action);
    }

    const ids = new Set(snapshot.map((a) => a.id));
    useOfflineStore.setState((s) => ({
      queue: s.queue.filter((q) => !ids.has(q.id)),
    }));

    const n = snapshot.length;
    dispatchFiferAlert({
      level: "INFO",
      title: "Datos Sincronizados",
      body:
        n === 1
          ? "1 acción enviada al servidor."
          : `${n} acciones enviadas al servidor.`,
      sourceKey: "offline:sync",
    });
    return n;
  } finally {
    syncInFlight = false;
  }
}

async function pushOfflineActionToLogsAndMocks(
  action: OfflineQueuedAction
): Promise<void> {
  applyOfflineActionToSyncMock(action);
  appendAuditLog(
    "SITE",
    `[Site Mode] Sincronizado: ${action.label}`,
    {
      offlineSync: true,
      actionId: action.id,
      kind: action.kind,
      payload: action.payload,
    }
  );
  await Promise.resolve();
}
