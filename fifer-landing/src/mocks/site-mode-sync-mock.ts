/**
 * Recepción demo post-sync offline — espía lo que “subió” desde obra (mocks en memoria).
 * En producción se reemplaza por API / Supabase.
 */
import type { OfflineQueuedAction } from "@/store/useOfflineStore";

export interface SyncedSiteModeEntry {
  id: string;
  syncedAt: number;
  kind: string;
  label: string;
  payload?: Record<string, unknown>;
}

const MAX = 200;
const applied: SyncedSiteModeEntry[] = [];

/** Aplica una acción sincronizada al mock (últimas N visibles para debug / futuras boxes). */
export function applyOfflineActionToSyncMock(action: OfflineQueuedAction): void {
  applied.unshift({
    id: action.id,
    syncedAt: Date.now(),
    kind: action.kind,
    label: action.label,
    payload: action.payload,
  });
  while (applied.length > MAX) applied.pop();
}

export function getSyncedSiteModeEntries(): SyncedSiteModeEntry[] {
  return [...applied];
}

export function getSyncedSiteModeCount(): number {
  return applied.length;
}
