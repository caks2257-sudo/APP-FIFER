import { NextRequest, NextResponse } from 'next/server';

import '@/engines/dom-engine';
import type { NormativeAnalyzerSubEngineApi } from '@/engines/dom-engine/sub-engines/normative-analyzer';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { loadDecryptedVault } from '@/lib/bridge-vault';
import { prisma } from '@/lib/prisma';
import { EngineRegistry } from '@/registry/engine-registry';
import { domAnalisisRequestSchema } from '@/types/schemas';

export const dynamic = 'force-dynamic';

/**
 * POST: análisis normativo paramétrico vía `dom-engine:normative-analyzer` + `external-bridge-engine` (OpenAI / Anthropic; MOCK simulado).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = domAnalisisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const input = parsed.data;
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: 'Usuario sin fila en Prisma; ejecute seed o sincronice identidad.' },
      { status: 404 },
    );
  }

  try {
    const vault = await loadDecryptedVault();
    const engine = EngineRegistry.use<NormativeAnalyzerSubEngineApi>('dom-engine:normative-analyzer');
    const out = await engine.runAnalysis(input, vault);
    return NextResponse.json(out);
  } catch (error) {
    console.error('[api/v1/dom/analisis]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 },
    );
  }
}
