import {
  resolveBridgeProbeId,
  type BridgeActivePing,
} from '@fifer/external-bridge-engine/bridge-latency';

import type { ExternalBridgeIntegrationClient } from '@/hooks/useExternalBridge';

/**
 * Cruce fila de integración ↔ sonda Bridge (`pingAllActiveIntegrations` / war-room).
 * Misma familia que `resolveBridgeProbeId` (descubrimiento dinámico).
 */
export function probeIdForIntegrationRow(row: ExternalBridgeIntegrationClient): string {
  return resolveBridgeProbeId(row.envKey);
}

export function resolvePingForRow(
  row: ExternalBridgeIntegrationClient,
  pings: BridgeActivePing[] | null | undefined,
): BridgeActivePing | undefined {
  if (!pings?.length) return undefined;
  const id = resolveBridgeProbeId(row.envKey);
  return pings.find((p) => p.id === id);
}
