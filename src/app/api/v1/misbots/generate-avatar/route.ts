import { NextResponse } from 'next/server';
import '@/engines/ai-fallback-cascade';
import { EngineRegistry } from '@/registry/engine-registry';
import type { ImageGenSubEngine } from '@/engines/ai-fallback-cascade/sub-engines/image-gen';
import type { CoreProfile } from '@/types/user-dna';

type GenerateAvatarBody = {
  botId?: unknown;
  prompt?: unknown;
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

export async function POST(req: Request) {
  try {
    let body: GenerateAvatarBody;
    try {
      body = (await req.json()) as GenerateAvatarBody;
    } catch {
      return NextResponse.json(
        { ok: false, code: 'IMAGEGEN_BAD_REQUEST', reason: 'Cuerpo JSON inválido' },
        { status: 400 },
      );
    }

    const { botId, prompt, core } = body;

    if (typeof botId !== 'string' || !botId.trim()) {
      return NextResponse.json(
        { ok: false, code: 'IMAGEGEN_BAD_REQUEST', reason: 'botId requerido' },
        { status: 400 },
      );
    }
    if (typeof prompt !== 'string') {
      return NextResponse.json(
        { ok: false, code: 'IMAGEGEN_BAD_REQUEST', reason: 'prompt requerido' },
        { status: 400 },
      );
    }
    if (!isCoreProfile(core)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'IMAGEGEN_BAD_REQUEST',
          reason: 'core (CoreProfile) requerido con nombres y apellidoPaterno',
        },
        { status: 400 },
      );
    }

    const imgEngine = EngineRegistry.use<ImageGenSubEngine>('ai-fallback:image-gen');
    const result = await imgEngine.generate({ prompt }, core);

    if (!result.ok) {
      const status = result.code === 'IMAGEGEN_EXHAUSTED' ? 503 : 422;
      return NextResponse.json({ ...result, botId: botId.trim() }, { status });
    }

    return NextResponse.json({
      ok: true,
      botId: botId.trim(),
      imageUrl: result.imageUrl,
      provider: result.provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { ok: false, code: 'IMAGEGEN_SERVER', reason: message },
      { status: 500 },
    );
  }
}
