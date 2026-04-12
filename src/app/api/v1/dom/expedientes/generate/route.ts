import { NextRequest, NextResponse } from 'next/server';

import '@/engines/dom-engine';
import type { FormGeneratorSubEngineApi } from '@/engines/dom-engine/sub-engines/form-generator';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { prisma } from '@/lib/prisma';
import { EngineRegistry } from '@/registry/engine-registry';
import { domExpedienteGenerateRequestSchema } from '@/types/schemas';

export const dynamic = 'force-dynamic';

/**
 * POST: borrador JSON de expediente municipal vía `dom-engine:form-generator`.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = domExpedienteGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

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
    const engine = EngineRegistry.use<FormGeneratorSubEngineApi>('dom-engine:form-generator');
    const { formType, projectData } = parsed.data;
    const draft = engine.generateFormDraft(formType, projectData ?? {});

    const row = await prisma.domExpediente.create({
      data: {
        userId: dbUser.id,
        formType,
        projectData: draft as object,
        status: 'DRAFT',
        mainApp: 'dom',
        subApp: 'hub-expediente',
      },
    });

    return NextResponse.json({
      schemaVersion: '1.0-dom-expediente-draft' as const,
      capturedAt: new Date().toISOString(),
      draft,
      expediente: {
        id: row.id,
        formType: row.formType,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[api/v1/dom/expedientes/generate]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 },
    );
  }
}
