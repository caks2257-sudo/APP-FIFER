import { NextResponse } from 'next/server';

import '@/engines/external-bridge-engine';
import type { ExternalBridgeEngineApi } from '@/engines/external-bridge-engine';
import {
  buildUnifiedIntegrationStatuses,
  parseDotEnv,
} from '@fifer/external-bridge-engine';
import { readEnvFile } from '@/engines/system-engine/sub-engines/env-manager';
import { loadDecryptedVault } from '@/lib/bridge-vault';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';

export const dynamic = 'force-dynamic';

function processEnvToRecord(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

/**
 * Estado unificado: adaptadores Bridge + auto-descubrimiento desde `.env` (dev) y process.env.
 * No expone valores de secretos.
 */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const vault = await loadDecryptedVault();
    const engine = EngineRegistry.use<ExternalBridgeEngineApi>(
      'external-bridge-engine',
    );
    const bridgeRows = engine.getPublicIntegrationStatuses(vault);

    let mergedEnv = processEnvToRecord();
    try {
      const raw = await readEnvFile();
      mergedEnv = { ...mergedEnv, ...parseDotEnv(raw) };
    } catch {
      /* fuera de development o sin archivo: solo process.env */
    }

    const integrations = buildUnifiedIntegrationStatuses(
      bridgeRows,
      mergedEnv,
      vault,
    );
    const mockCount = integrations.filter((i) => i.mode === 'MOCK').length;
    const prodCount = integrations.filter((i) => i.mode === 'PROD').length;

    return NextResponse.json({
      schemaVersion: '2.0-external-bridge-unified',
      capturedAt: new Date().toISOString(),
      integrations,
      summary: { mockCount, prodCount },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'bridge-status-error',
      },
      { status: 500 },
    );
  }
}
