import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import '@/engines/ai-orchestrator-engine';
import type { AiOrchestratorEngine } from '@/engines/ai-orchestrator-engine';
import { requirePrismaUser } from '@/app/api/v1/ai-orchestrator/_auth';
import { EngineRegistry } from '@/registry/engine-registry';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  prompt: z.string().min(1, 'prompt no puede estar vacío.'),
  revalidateTarget: z.string().min(1).optional(),
});

/**
 * Tool endpoint §28.4: instrucción natural -> nuevo dashboardLayout persistido.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación fallida', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const auth = await requirePrismaUser();
  if (!auth.ok) return auth.response;

  try {
    const engine = EngineRegistry.use<AiOrchestratorEngine>('ai-orchestrator-engine');
    const result = await engine.rearrangeDashboardLayout(
      auth.dbUser.id,
      parsed.data.prompt,
      parsed.data.revalidateTarget,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API] /v1/ai-orchestrator/layout/rearrange', error);
    const message =
      error instanceof Error ? error.message : 'Error interno de soberanía de layout.';
    return NextResponse.json(
      {
        error: 'Error al reorganizar el layout del dashboard.',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 },
    );
  }
}
