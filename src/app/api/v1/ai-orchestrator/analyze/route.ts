import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import '@/engines/ai-orchestrator-engine';
import type { AiOrchestratorEngine } from '@/engines/ai-orchestrator-engine';
import {
  assertAodsSessionOwned,
  rejectMismatchedOwnerId,
  requirePrismaUser,
} from '../_auth';
import { EngineRegistry } from '@/registry/engine-registry';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  sessionId: z.string().uuid('sessionId debe ser un UUID válido.'),
  notebookContext: z
    .string()
    .min(1, 'notebookContext no puede estar vacío.'),
  ownerId: z.string().min(1).optional(),
});

/**
 * POST /api/v1/ai-orchestrator/analyze — Fase 3: volcado NotebookLM → GEMINI_DOC.
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

  const { sessionId, notebookContext, ownerId: ownerIdFromBody } = parsed.data;

  const auth = await requirePrismaUser();
  if (!auth.ok) return auth.response;

  const forbidden = rejectMismatchedOwnerId(ownerIdFromBody, auth.dbUser.id);
  if (forbidden) return forbidden;

  const owned = await assertAodsSessionOwned(sessionId, auth.dbUser.id);
  if (!owned.ok) return owned.response;

  try {
    const orchestratorEngine = EngineRegistry.use<AiOrchestratorEngine>(
      'ai-orchestrator-engine',
    );
    const result = await orchestratorEngine.analyzeNotebookResponse(
      sessionId,
      notebookContext,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API] /v1/ai-orchestrator/analyze', error);
    const message =
      error instanceof Error ? error.message : 'Error interno de orquestación.';
    const status = message.includes('no está registrado') ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? 'El motor ai-orchestrator-engine no está disponible.'
            : 'Error al analizar la respuesta de NotebookLM.',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status },
    );
  }
}
