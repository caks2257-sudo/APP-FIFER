import { NextRequest, NextResponse } from 'next/server';

import { AodsDocType } from '@prisma/client';

import { formatLlmProviderPreferenceLabel } from '@/engines/ai-orchestrator-engine/llm/display-label';
import { extractLlmSecretsFromVault } from '@/engines/ai-orchestrator-engine/llm/vault-secrets';
import { loadDecryptedVault } from '@/lib/bridge-vault';
import { prisma } from '@/lib/prisma';

import { assertAodsSessionOwned, requirePrismaUser } from '../../../_auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/ai-orchestrator/session/:sessionId/handoff
 * Contexto para modales manuales: prompt Fase 1 (NotebookLM) y etiquetas de motor.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;

  const auth = await requirePrismaUser();
  if (!auth.ok) return auth.response;

  const owned = await assertAodsSessionOwned(sessionId, auth.dbUser.id);
  if (!owned.ok) return owned.response;

  try {
    const doc = await prisma.aodsDocument.findFirst({
      where: { sessionId, type: AodsDocType.NOTEBOOK_PROMPT },
      orderBy: { createdAt: 'desc' },
    });

    const raw = doc?.content;
    let notebookPrompt: string | null = null;
    let notebookPromptMock = false;
    if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
      const p = (raw as Record<string, unknown>).prompt;
      const m = (raw as Record<string, unknown>).mock;
      if (typeof p === 'string' && p.trim()) notebookPrompt = p;
      notebookPromptMock = Boolean(m);
    }

    const vault = await loadDecryptedVault();
    const llmSecrets = extractLlmSecretsFromVault(vault);
    const liveMotorLabel = formatLlmProviderPreferenceLabel(llmSecrets);
    const phase1MotorLabel = notebookPromptMock
      ? 'MOCK (sin API en vivo · heurística)'
      : liveMotorLabel;

    const phase7MergeMotorLabel = liveMotorLabel;

    return NextResponse.json(
      {
        schemaVersion: '1.0-aods-handoff' as const,
        sessionId,
        notebookPrompt,
        notebookPromptMock,
        phase1MotorLabel,
        phase7MergeMotorLabel,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error('[API] GET handoff', e);
    return NextResponse.json(
      { error: 'No se pudo cargar el contexto de handoff.' },
      { status: 500 },
    );
  }
}
