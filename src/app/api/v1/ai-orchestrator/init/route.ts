import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import '@/engines/ai-orchestrator-engine';
import type { AiOrchestratorEngine } from '@/engines/ai-orchestrator-engine';
import {
  rejectMismatchedOwnerId,
  requirePrismaUser,
} from '../_auth';
import { EngineRegistry } from '@/registry/engine-registry';

export const dynamic = 'force-dynamic';

const IdeationMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(200_000),
});

const InitSessionBodySchema = z.object({
  planMaestro: z
    .string()
    .min(10, 'El plan maestro debe tener al menos 10 caracteres.'),
  /** Fase -1: historial de ideación previo (opcional). */
  chatHistory: z.array(IdeationMessageSchema).max(200).optional(),
  /** Opcional: si se envía, debe coincidir con el `User.id` de Prisma del usuario autenticado (p. ej. pruebas con curl). */
  ownerId: z.string().min(1).optional(),
});

/**
 * POST /api/v1/ai-orchestrator/init — Fase 0 AODS: persiste sesión y dispara Fase 1 en background.
 * El `ownerId` efectivo es siempre el de la fila `User` en Prisma vinculada a la sesión Supabase (no se confía en el body en solitario).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = InitSessionBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación fallida', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { planMaestro, chatHistory, ownerId: ownerIdFromBody } = parsed.data;

  const auth = await requirePrismaUser();
  if (!auth.ok) return auth.response;

  const forbidden = rejectMismatchedOwnerId(ownerIdFromBody, auth.dbUser.id);
  if (forbidden) return forbidden;

  const { dbUser } = auth;

  try {
    const orchestratorEngine = EngineRegistry.use<AiOrchestratorEngine>(
      'ai-orchestrator-engine',
    );

    const result = await orchestratorEngine.initSession({
      planMaestro,
      ownerId: dbUser.id,
      chatHistory,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API] /v1/ai-orchestrator/init', error);
    const message =
      error instanceof Error ? error.message : 'Error interno de orquestación.';
    const status = message.includes('no está registrado') ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? 'El motor ai-orchestrator-engine no está disponible.'
            : 'Error interno al inicializar la sesión de orquestación.',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status },
    );
  }
}
