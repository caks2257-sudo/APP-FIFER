import { NextResponse } from 'next/server';

import {
  PrismaAuthLegacyEmailConflictError,
  syncThenFindUser,
} from '@/lib/prisma-auth-sync';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';

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

  if (!authUser?.email || !authUser.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let dbUser;
  try {
    dbUser = await syncThenFindUser(authUser);
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return NextResponse.json(
        { error: 'Identidad desalineada con Supabase Auth.' },
        { status: 409 },
      );
    }
    throw error;
  }

  if (!dbUser) {
    return NextResponse.json({ error: 'Usuario no encontrado tras sincronizar.' }, { status: 404 });
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

