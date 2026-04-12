/**
 * Snapshot de salud arquitectónica (§17) — solo tipos, sin `fs` ni runtime de sonda.
 * La UI cliente debe importar desde aquí en lugar de `architecture-probe.ts`.
 */

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
