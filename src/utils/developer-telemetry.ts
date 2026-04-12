import type { BridgeActivePing } from '@fifer/external-bridge-engine/bridge-latency';

import type { EngineSlotSnapshot, HealthEndpointSnapshot } from '@/types/system-health-ui';

/** Métricas agregadas para micro-gráficos (SRE / Sala de Guerra). */
export type TelemetryHealthStats = {
  uptimePercent: number;
  uptimeLabel?: string;
  errorCount: number;
  errorLabel?: string;
  avgLatencyMs: number | null;
  latencyBarMaxMs?: number;
  /** Conteos explícitos LIVE / MOCK (§16 — cabecera APIs externas). */
  liveCount?: number;
  mockCount?: number;
};

function tierEndpoint(s: HealthEndpointSnapshot): 'online' | 'degraded' | 'offline' {
  if (s.invalidKey || s.pulse === 'down') return 'offline';
  if (s.pulse === 'degraded' || s.pulse === 'unknown') return 'degraded';
  if (s.latencyMs != null && s.latencyMs > 500) return 'degraded';
  return 'online';
}

function tierEngine(s: EngineSlotSnapshot): 'online' | 'degraded' | 'offline' {
  if (s.pulse === 'down') return 'offline';
  if (s.pulse === 'degraded' || s.pulse === 'unknown') return 'degraded';
  return 'online';
}

function avgBridgeLatency(pings: BridgeActivePing[] | null | undefined): number | null {
  if (!pings?.length) return null;
  const usable = pings.filter((p) => !p.skipped && p.latencyMs >= 0);
  if (!usable.length) return null;
  const sum = usable.reduce((a, p) => a + p.latencyMs, 0);
  return sum / usable.length;
}

/** Resumen pestaña APIs externas — Live vs Mock + latencia Bridge (war-room). */
export function telemetryFromExternalBridge(
  prodCount: number,
  mockCount: number,
  bridgeLatencies: BridgeActivePing[] | null | undefined,
): TelemetryHealthStats {
  const total = prodCount + mockCount;
  const uptimePercent = total > 0 ? Math.round((100 * prodCount) / total) : 0;
  return {
    uptimePercent,
    uptimeLabel: '% Live',
    errorCount: mockCount,
    errorLabel: 'Mock',
    liveCount: prodCount,
    mockCount,
    avgLatencyMs: avgBridgeLatency(bridgeLatencies ?? null),
    latencyBarMaxMs: 2500,
  };
}

/** Resumen pestaña APIs internas — system-health `internal` (payload data-driven). */
export function telemetryFromInternalApis(
  internal: Record<string, HealthEndpointSnapshot> | null,
  degradedPayload: boolean,
): TelemetryHealthStats {
  if (degradedPayload || !internal) {
    return {
      uptimePercent: 0,
      uptimeLabel: '% OK',
      errorCount: 0,
      errorLabel: 'Offline',
      avgLatencyMs: null,
      latencyBarMaxMs: 2000,
    };
  }
  const eps = Object.values(internal);
  if (eps.length === 0) {
    return {
      uptimePercent: 0,
      uptimeLabel: '% OK',
      errorCount: 0,
      errorLabel: 'Offline',
      avgLatencyMs: null,
      latencyBarMaxMs: 2000,
    };
  }
  const tiers = eps.map(tierEndpoint);
  const ok = tiers.filter((t) => t === 'online').length;
  const uptimePercent = Math.round((100 * ok) / eps.length);
  const errorCount = tiers.filter((t) => t === 'offline' || t === 'degraded').length;
  const latencies = eps
    .map((e) => e.latencyMs)
    .filter((n): n is number => n != null && n >= 0);
  const avgLatencyMs =
    latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;

  return {
    uptimePercent,
    uptimeLabel: '% OK',
    errorCount,
    errorLabel: 'Incidencias',
    avgLatencyMs,
    latencyBarMaxMs: 2000,
  };
}

/** Sala de Guerra — % motores online + latencia media Bridge (puentes). */
export function telemetryFromWarRoom(
  enginesById: Record<string, EngineSlotSnapshot> | null,
  bridgeLatencies: BridgeActivePing[] | null | undefined,
  degraded: boolean,
): TelemetryHealthStats {
  const avgMs = avgBridgeLatency(bridgeLatencies ?? null);
  if (degraded || !enginesById || Object.keys(enginesById).length === 0) {
    return {
      uptimePercent: 0,
      uptimeLabel: '% Online motores',
      errorCount: 0,
      errorLabel: 'Degrad.+Off',
      avgLatencyMs: avgMs,
      latencyBarMaxMs: 2500,
    };
  }
  const snaps = Object.values(enginesById);
  let online = 0;
  let degradedCount = 0;
  let offline = 0;
  for (const s of snaps) {
    const t = tierEngine(s);
    if (t === 'online') online++;
    else if (t === 'degraded') degradedCount++;
    else offline++;
  }
  const total = snaps.length;
  const uptimePercent = total > 0 ? Math.round((100 * online) / total) : 0;
  return {
    uptimePercent,
    uptimeLabel: '% Online motores',
    errorCount: degradedCount + offline,
    errorLabel: 'Motores degrad./off',
    avgLatencyMs: avgMs,
    latencyBarMaxMs: 2500,
  };
}

/** Resumen pestaña Matriz de motores — system-health `engines.byId`. */
export function telemetryFromEngines(
  byId: Record<string, EngineSlotSnapshot> | null,
  degradedPayload: boolean,
): TelemetryHealthStats {
  if (degradedPayload || !byId || Object.keys(byId).length === 0) {
    return {
      uptimePercent: 0,
      uptimeLabel: '% Online',
      errorCount: 0,
      errorLabel: 'Degrad.+Off',
      avgLatencyMs: null,
      latencyBarMaxMs: 2000,
    };
  }
  const snaps = Object.values(byId);
  let online = 0;
  let degraded = 0;
  let offline = 0;
  for (const s of snaps) {
    const t = tierEngine(s);
    if (t === 'online') online++;
    else if (t === 'degraded') degraded++;
    else offline++;
  }
  const total = snaps.length;
  const uptimePercent = total > 0 ? Math.round((100 * online) / total) : 0;
  const errorCount = degraded + offline;

  return {
    uptimePercent,
    uptimeLabel: '% Online',
    errorCount,
    errorLabel: 'Degrad.+Off',
    avgLatencyMs: null,
    latencyBarMaxMs: 2000,
  };
}
