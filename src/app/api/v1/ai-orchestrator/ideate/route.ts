import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import '@/engines/ai-orchestrator-engine';
import type { AiOrchestratorEngine } from '@/engines/ai-orchestrator-engine';
import { requirePrismaUser } from '../_auth';
import { EngineRegistry } from '@/registry/engine-registry';

export const dynamic = 'force-dynamic';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(200_000),
});

const IdeateBodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(100),
});

/**
 * POST /api/v1/ai-orchestrator/ideate — Fase -1: conversación sin persistir sesión (Bridge OpenAI/Anthropic).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = IdeateBodySchema.safeParse(body);
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
    const result = await engine.ideate(parsed.data.messages);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API] /v1/ai-orchestrator/ideate', error);
    const message =
      error instanceof Error ? error.message : 'Error interno de ideación.';
    return NextResponse.json(
      {
        error: 'Error al generar la respuesta de ideación.',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 },
    );
  }
}
