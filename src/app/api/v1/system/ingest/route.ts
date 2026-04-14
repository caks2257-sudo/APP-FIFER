import { NextResponse } from 'next/server';

import { requirePrismaUser } from '@/app/api/v1/ai-orchestrator/_auth';
import { generateCodeSnapshot } from '@/engines/system-engine/ingest-manager';

export const runtime = 'nodejs';

type IngestOptions = {
  code: boolean;
  xrays: boolean;
  audit: boolean;
};

function parseIngestOptions(payload: unknown): IngestOptions {
  const options = (payload as { options?: unknown })?.options as Partial<IngestOptions> | undefined;
  return {
    code: options?.code === true,
    xrays: options?.xrays === true,
    audit: options?.audit === true,
  };
}

export async function POST(request: Request) {
  const auth = await requirePrismaUser();
  if (!auth.ok) return auth.response;

  if (auth.dbUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const options = parseIngestOptions(body);
    const files = await generateCodeSnapshot(options);
    return NextResponse.json({ success: true, files }, { status: 200 });
  } catch (error) {
    console.error('[system-ingest] Failed to generate snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo generar el snapshot del repositorio.' },
      { status: 500 },
    );
  }
}
