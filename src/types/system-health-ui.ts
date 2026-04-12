/**
 * Contratos UI / API para salud del sistema — sin imports desde `src/engines/*`.
 * El motor `system-health` re-exporta desde aquí vía `public-types` / `architecture-types`.
 */

export type AiProviderPulse = 'up' | 'degraded' | 'down' | 'unknown';

export type HealthEndpointSnapshot = {
  pulse: AiProviderPulse;
  latencyMs: number | null;
  note: string;
  invalidKey?: boolean;
  httpStatus?: number;
};

export type EngineSlotSnapshot = {
  registered: boolean;
  inService: boolean;
  loadHint: 'loaded' | 'not-mounted';
  pulse: AiProviderPulse;
  note: string;
};

export type GlobalHealthStatus = {
  schemaVersion: '1.0-system-health';
  capturedAt: string;
  external: {
    openai: HealthEndpointSnapshot;
    google: HealthEndpointSnapshot;
  };
  /** Sondas HTTP internas por id estable (p. ej. misbots, contratos) — data-driven. */
  internal: Record<string, HealthEndpointSnapshot>;
  engines: {
    byId: Record<string, EngineSlotSnapshot>;
  };
};

export const ARCHITECTURE_HEALTH_SCHEMA_VERSION = '1.1-architecture-health' as const;

export type ArchitectureHealthSnapshot = {
  schemaVersion: typeof ARCHITECTURE_HEALTH_SCHEMA_VERSION;
  capturedAt: string;
  readMode: 'filesystem' | 'bundle';
  reason?: string;
  constitution: {
    versionLabel: string | null;
    headline: string | null;
  };
  gps: {
    anchorCount: number | null;
  };
  autoHealing: {
    exists: boolean | null;
    bytes: number | null;
    modifiedAtIso: string | null;
  };
  orphanedEngines: string[];
  orphanScanSkipped?: boolean;
};
