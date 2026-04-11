import { NextResponse } from 'next/server';
import '@/engines/ai-fallback-cascade';
import { EngineRegistry } from '@/registry/engine-registry';
import {
  AiCascadeExhaustedError,
  type AiFallbackCascadeEngine,
} from '@/engines/ai-fallback-cascade';
import type { AppPreferences, CoreProfile } from '@/types/user-dna';

type DualStageRequestBody = {
  moduleId?: unknown;
  boxId?: unknown;
  contextData?: unknown;
  systemInstruction?: unknown;
  dna?: unknown;
  core?: unknown;
};

function isCoreProfile(v: unknown): v is CoreProfile {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  if (typeof c.nombres !== 'string' || typeof c.apellidoPaterno !== 'string') {
    return false;
  }
  if (c.tier !== undefined && c.tier !== 'free' && c.tier !== 'pro') {
    return false;
  }
  return true;
}

function isAppPreferences(v: unknown): v is AppPreferences {
  return v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v);
}

export async function POST(req: Request) {
  try {
    let body: DualStageRequestBody;
    try {
      body = (await req.json()) as DualStageRequestBody;
    } catch {
      return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
    }

    const { moduleId, boxId, contextData, systemInstruction, dna, core } = body;

    if (typeof moduleId !== 'string' || !moduleId.trim()) {
      return NextResponse.json({ error: 'moduleId requerido' }, { status: 400 });
    }
    if (typeof boxId !== 'string' || !boxId.trim()) {
      return NextResponse.json({ error: 'boxId requerido' }, { status: 400 });
    }
    if (typeof systemInstruction !== 'string' || !systemInstruction.trim()) {
      return NextResponse.json({ error: 'systemInstruction requerido' }, { status: 400 });
    }
    if (!isAppPreferences(dna)) {
      return NextResponse.json({ error: 'dna (AppPreferences) requerido' }, { status: 400 });
    }
    if (!isCoreProfile(core)) {
      return NextResponse.json(
        { error: 'core (CoreProfile) requerido con nombres y apellidoPaterno' },
        { status: 400 },
      );
    }

    const userInstruction = [
      `Instrucción del Sistema: ${systemInstruction}`,
      '',
      `Perfil Core: Usuario: ${core.nombres} ${core.apellidoPaterno}`,
      '',
      `Preferencias del Módulo: ADN Fractal: ${JSON.stringify(dna)}`,
      '',
      `Datos de Contexto: Datos a analizar: ${JSON.stringify(contextData)}`,
    ].join('\n');

    const aiEngine = EngineRegistry.use<AiFallbackCascadeEngine>('ai-fallback');
    const { finalOutput } = await aiEngine.processInsight(userInstruction, core, {
      meta: { moduleId, boxId },
    });

    return NextResponse.json({ insight: finalOutput });
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
