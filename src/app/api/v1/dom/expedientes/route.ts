import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export type DomExpedienteListItem = {
  id: string;
  formType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * GET: expedientes DOM persistidos del usuario (borradores y enviados), más recientes primero.
 */
export async function GET() {
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

  const rows = await prisma.domExpediente.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      formType: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const items: DomExpedienteListItem[] = rows.map((r) => ({
    id: r.id,
    formType: r.formType,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    schemaVersion: '1.0-dom-expedientes-list' as const,
    capturedAt: new Date().toISOString(),
    items,
  });
}
