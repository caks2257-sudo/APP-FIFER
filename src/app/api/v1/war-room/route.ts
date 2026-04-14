import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import '@/engines/external-bridge-engine';
import type { ExternalBridgeEngineApi } from '@/engines/external-bridge-engine';
import {
  type ArchitectureHealthSnapshot,
  runArchitectureProbe,
} from '@/engines/system-health/architecture-probe';
import type { GlobalHealthStatus } from '@/engines/system-health';
import '@/engines/system-health';
import { getEnvManagerRecentEvents } from '@/engines/system-engine/sub-engines/env-manager';
import {
  PrismaAuthLegacyEmailConflictError,
  syncThenFindUser,
} from '@/lib/prisma-auth-sync';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';

export const dynamic = 'force-dynamic';

export type WarRoomPayload = {
  schemaVersion: '1.0-war-room';
  capturedAt: string;
  engines: GlobalHealthStatus['engines'];
  bridgeLatencies: Awaited<
    ReturnType<ExternalBridgeEngineApi['pingAllActiveIntegrations']>
  >;
  envManagerLog: ReturnType<typeof getEnvManagerRecentEvents>;
  /** §17 — escáner estructural (constitución, GPS, compliance). */
  architectureHealth: ArchitectureHealthSnapshot;
};

/**
 * Sala de Guerra — admin: motores (system-health), latencias Bridge, auditoría env-manager.
 */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email || !authUser.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let dbUser;
  try {
    dbUser = await syncThenFindUser(authUser);
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return NextResponse.json(
        { error: 'Identidad desalineada con Supabase Auth.' },
        { status: 409 },
      );
    }
    throw error;
  }

  if (!dbUser || dbUser.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  try {
    const h = headers();
    const host = h.get('host') ?? 'localhost:3000';
    const proto = h.get('x-forwarded-proto') ?? 'http';
    const origin = `${proto}://${host}`;

    const health = EngineRegistry.use<{
      getGlobalStatus: (o: { origin: string }) => Promise<GlobalHealthStatus>;
    }>('system-health');

    const bridge = EngineRegistry.use<ExternalBridgeEngineApi>('external-bridge-engine');

    const [full, bridgeLatencies, envManagerLog, architectureHealth] = await Promise.all([
      health.getGlobalStatus({ origin }),
      bridge.pingAllActiveIntegrations(),
      Promise.resolve(getEnvManagerRecentEvents()),
      runArchitectureProbe(),
    ]);

    const body: WarRoomPayload = {
      schemaVersion: '1.0-war-room',
      capturedAt: new Date().toISOString(),
      engines: full.engines,
      bridgeLatencies,
      envManagerLog,
      architectureHealth,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        degraded: true,
        schemaVersion: '1.0-war-room-degraded',
        errorMessage: error instanceof Error ? error.message : 'war-room error',
      },
      { status: 500 },
    );
  }
}
