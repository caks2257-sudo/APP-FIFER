import { NextResponse } from 'next/server';
import type { ModelMessage } from 'ai';
import { z } from 'zod';

import '@/engines/ai-fallback-cascade';
import '@/engines/ai-orchestrator-engine';
import {
  AiCascadeExhaustedError,
  type AiFallbackCascadeEngine,
} from '@/engines/ai-fallback-cascade';
import type { AiOrchestratorEngine } from '@/engines/ai-orchestrator-engine';
import { requirePrismaUser } from '@/app/api/v1/ai-orchestrator/_auth';
import { getFinanceDashboardData } from '@/actions/finance';
import { EngineRegistry } from '@/registry/engine-registry';
import { boxCatalog } from '@/registry/box-catalog';
import type { CoreProfile } from '@/types/user-dna';
import { layoutCommandSchema, type LayoutCommand } from '@/types/layout-command';
import {
  buildSharedChatSystemPrompt,
  inferLayoutCommandFromUserMessage,
  parseSharedChatAiEnvelope,
} from '@/utils/shared-chat-layout';
import { langgraph } from '@/lib/integrations/langgraph';

const classifierTurnSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(100_000),
});

const chatBodySchema = z
  .object({
    prompt: z.string().min(1).max(100_000).optional(),
    messages: z.array(classifierTurnSchema).max(80).optional(),
    currentContext: z.string().min(1, 'currentContext requerido'),
    locale: z.string().min(2).default('es-CL'),
    appContext: z.string().min(1).optional(),
  })
  .refine(
    (d) =>
      (d.messages != null && d.messages.length > 0) ||
      (d.prompt != null && d.prompt.trim().length > 0),
    { message: 'Se requiere messages (no vacío) o prompt no vacío.' },
  );

/** Perfil mínimo solo para FinOps de cascada; sin persistencia ni expediente. */
const EPHEMERAL_SHARED_CHAT_CORE: CoreProfile = {
  nombres: 'Usuario',
  apellidoPaterno: 'FIFER',
  apellidoMaterno: '',
  nacionalidad: 'CL',
  fechaNacimiento: '1970-01-01',
  rut: '1-9',
  tier: 'free',
};

function normalizeLayoutCommand(cmd: unknown): LayoutCommand | undefined {
  const p = layoutCommandSchema.safeParse(cmd);
  if (!p.success) return undefined;
  const c = p.data;
  if (c.action === 'add') {
    if (!c.boxId || !(c.boxId in boxCatalog)) return undefined;
    return c as LayoutCommand;
  }
  if (c.action === 'remove') {
    if (!c.widgetId) return undefined;
    return c as LayoutCommand;
  }
  if (c.action === 'resize') {
    if (!c.widgetId) return undefined;
    if (c.colSpan == null && c.rowSpan == null) return undefined;
    return c as LayoutCommand;
  }
  return undefined;
}

function looksLikeLayoutRearrange(prompt: string): boolean {
  return /\b(layout|dashboard|grilla|widget|panel|mueve|reordena|arriba|abajo|izquierda|derecha)\b/i.test(
    prompt,
  );
}

export async function POST(req: Request) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
    }

    const parsed = chatBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { prompt, messages: bodyMessages, currentContext, locale, appContext } =
      parsed.data;

    const classifierMessages: ModelMessage[] =
      bodyMessages != null && bodyMessages.length > 0
        ? bodyMessages.map((m) => ({ role: m.role, content: m.content }))
        : [{ role: 'user', content: prompt!.trim() }];

    const lastUserForLayout = (() => {
      for (let i = classifierMessages.length - 1; i >= 0; i--) {
        const m = classifierMessages[i];
        if (m.role === 'user' && typeof m.content === 'string') return m.content;
      }
      return prompt?.trim() ?? '';
    })();

    const auth = await requirePrismaUser();
    if (!auth.ok) return auth.response;

    const orchestrator = EngineRegistry.use<AiOrchestratorEngine>(
      'ai-orchestrator-engine',
    );
    const orchestratorResult = await orchestrator.processSharedChat(
      classifierMessages,
      currentContext,
      locale,
      auth.dbUser.role,
      auth.dbUser.tier,
    );

    if (orchestratorResult.action === 'NAVIGATE') {
      return NextResponse.json(orchestratorResult);
    }

    if (orchestratorResult.action === 'TEXT_ONLY') {
      return NextResponse.json(orchestratorResult);
    }

    if (
      orchestratorResult.action === 'STREAM_UI' ||
      orchestratorResult.action === 'GUIDED_OVERLAY'
    ) {
      const widgets = orchestratorResult.visualWidgets;
      const needsFinanceData = widgets.some((id) =>
        ['BankConnectionWidget', 'CashFlowWidget'].includes(id),
      );

      if (needsFinanceData) {
        const financeData = await getFinanceDashboardData();
        if (!financeData.ok || !financeData.hasAccount) {
          return NextResponse.json({
            action: 'EXECUTE' as const,
            reply: 'No hay datos financieros disponibles para vista rápida.',
            reasoning: orchestratorResult.reasoning,
            mock: false,
          });
        }
        return NextResponse.json({
          action: orchestratorResult.action,
          reply: orchestratorResult.reply,
          reasoning: orchestratorResult.reasoning,
          visualWidgets: orchestratorResult.visualWidgets,
          ...(orchestratorResult.warRoomConfig != null
            ? { warRoomConfig: orchestratorResult.warRoomConfig }
            : {}),
          finance: {
            fintocAccount: financeData.fintocAccount,
            cashFlowReport: financeData.cashFlowReport,
          },
          ...(orchestratorResult.action === 'GUIDED_OVERLAY'
            ? { mock: orchestratorResult.mock }
            : {}),
        });
      }

      return NextResponse.json({
        action: orchestratorResult.action,
        reply: orchestratorResult.reply,
        reasoning: orchestratorResult.reasoning,
        visualWidgets: orchestratorResult.visualWidgets,
        ...(orchestratorResult.warRoomConfig != null
          ? { warRoomConfig: orchestratorResult.warRoomConfig }
          : {}),
        ...(orchestratorResult.action === 'GUIDED_OVERLAY'
          ? { mock: orchestratorResult.mock }
          : {}),
      });
    }

    if (looksLikeLayoutRearrange(lastUserForLayout)) {
      const rearranged = await langgraph.runAgent(lastUserForLayout, auth.dbUser.id);
      return NextResponse.json({
        action: 'EXECUTE' as const,
        reply: rearranged.message,
        layout: rearranged.layout,
        mock: rearranged.mock,
      });
    }

    const effectiveAppContext = appContext ?? currentContext;
    const systemPrompt = buildSharedChatSystemPrompt(effectiveAppContext);
    const userPrompt = `${systemPrompt}\n\n---\n\nMensaje del usuario:\n${lastUserForLayout}`;

    const aiEngine = EngineRegistry.use<AiFallbackCascadeEngine>('ai-fallback');
    const { finalOutput } = await aiEngine.processInsight(
      userPrompt,
      EPHEMERAL_SHARED_CHAT_CORE,
      {
        meta: { moduleId: effectiveAppContext, boxId: 'shared-chat' },
      },
    );

    const parsedEnvelope = parseSharedChatAiEnvelope(finalOutput);
    let layoutCommand = normalizeLayoutCommand(parsedEnvelope.layoutCommand);

    if (layoutCommand === undefined && !parsedEnvelope.structured) {
      layoutCommand = normalizeLayoutCommand(
        inferLayoutCommandFromUserMessage(lastUserForLayout),
      );
    }

    return NextResponse.json({
      action: 'EXECUTE' as const,
      reply: parsedEnvelope.reply.trim() || finalOutput.trim(),
      layoutCommand: layoutCommand ?? undefined,
      reasoning:
        orchestratorResult.action === 'EXECUTE'
          ? orchestratorResult.reasoning
          : 'Respuesta textual de fallback cascade',
    });
  } catch (error) {
    if (error instanceof AiCascadeExhaustedError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          tierErrors: error.tierErrors,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno del servidor',
      },
      { status: 500 },
    );
  }
}
