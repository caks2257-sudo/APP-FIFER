import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import '@/engines/ai-fallback-cascade';
import type { GlobalHealthStatus } from '@/engines/system-health';
import '@/engines/system-health';
import { EngineRegistry } from '@/registry/engine-registry';

type HealthScope = 'external' | 'internal' | 'engines' | 'full';

function sliceHealthPayload(
  full: GlobalHealthStatus,
  scope: HealthScope
): Record<string, unknown> {
  const base = {
    schemaVersion: full.schemaVersion,
    capturedAt: full.capturedAt,
    scope,
  };
  switch (scope) {
    case 'external':
      return { ...base, tab: 'external', external: full.external };
    case 'internal':
      return { ...base, tab: 'internal', internal: full.internal };
    case 'engines': {
      const byId: GlobalHealthStatus['engines']['byId'] = {};
      for (const [k, v] of Object.entries(full.engines.byId)) {
        byId[k] = v;
      }
      return { ...base, tab: 'engines', engines: { byId } };
    }
    default:
      return { ...base, tab: 'full', ...full };
  }
}

export async function GET(request: NextRequest) {
  const scopeRaw = request.nextUrl.searchParams.get('scope');
  const scope: HealthScope =
    scopeRaw === 'external' || scopeRaw === 'internal' || scopeRaw === 'engines'
      ? scopeRaw
      : 'full';

  try {
    const h = headers();
    const host = h.get('host') ?? 'localhost:3000';
    const proto = h.get('x-forwarded-proto') ?? 'http';
    const origin = `${proto}://${host}`;

    const engine = EngineRegistry.use<{ getGlobalStatus: (o: { origin: string }) => Promise<GlobalHealthStatus> }>(
      'system-health',
    );
    const full = await engine.getGlobalStatus({ origin });
    const body = scope === 'full' ? { ...full, scope: 'full' as const, tab: 'full' as const } : sliceHealthPayload(full, scope);
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        degraded: true,
        schemaVersion: '1.0-system-health-degraded',
        errorMessage: error instanceof Error ? error.message : 'system-health error',
        scope,
      },
      { status: 500 },
    );
  }
}
