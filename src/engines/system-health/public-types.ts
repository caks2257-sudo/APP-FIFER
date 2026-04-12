/**
 * Tipos serializables del motor `system-health` — sin imports de Node ni side-effects.
 * La UI cliente debe importar solo desde este archivo (no desde `index.ts` del motor).
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
  internal: {
    misbots: HealthEndpointSnapshot;
    contratos: HealthEndpointSnapshot;
  };
  engines: {
    byId: Record<string, EngineSlotSnapshot>;
  };
};
