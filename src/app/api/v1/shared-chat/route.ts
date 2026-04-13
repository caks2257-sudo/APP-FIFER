import { NextResponse } from 'next/server';
import { z } from 'zod';
import '@/engines/ai-fallback-cascade';
import {
  AiCascadeExhaustedError,
  type AiFallbackCascadeEngine,
} from '@/engines/ai-fallback-cascade';
import { EngineRegistry } from '@/registry/engine-registry';
import { boxCatalog } from '@/registry/box-catalog';
import type { CoreProfile } from '@/types/user-dna';
import { layoutCommandSchema, type LayoutCommand } from '@/types/layout-command';
import {
  buildSharedChatSystemPrompt,
  inferLayoutCommandFromUserMessage,
  parseSharedChatAiEnvelope,
} from '@/utils/shared-chat-layout';

const sharedChatBodySchema = z.object({
  message: z.string().min(1, 'message requerido'),
  appContext: z.string().min(1, 'appContext requerido'),
});

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

export async function POST(req: Request) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
    }

    const parsed = sharedChatBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { message, appContext } = parsed.data;
    const systemPrompt = buildSharedChatSystemPrompt(appContext);
    const userPrompt = `${systemPrompt}\n\n---\n\nMensaje del usuario:\n${message}`;

    const aiEngine = EngineRegistry.use<AiFallbackCascadeEngine>('ai-fallback');
    const { finalOutput } = await aiEngine.processInsight(userPrompt, EPHEMERAL_SHARED_CHAT_CORE, {
      meta: { moduleId: appContext, boxId: 'shared-chat' },
    });

    const parsedEnvelope = parseSharedChatAiEnvelope(finalOutput);
    let layoutCommand = normalizeLayoutCommand(parsedEnvelope.layoutCommand);

    if (layoutCommand === undefined && !parsedEnvelope.structured) {
      layoutCommand = normalizeLayoutCommand(inferLayoutCommandFromUserMessage(message));
    }

    return NextResponse.json({
      reply: parsedEnvelope.reply.trim() || finalOutput.trim(),
      layoutCommand: layoutCommand ?? undefined,
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
