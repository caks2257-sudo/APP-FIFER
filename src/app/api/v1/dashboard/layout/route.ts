import { NextResponse } from 'next/server';

import {
  PrismaAuthLegacyEmailConflictError,
  syncThenFindUser,
} from '@/lib/prisma-auth-sync';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { dashboardLayoutPersistedSchema } from '@/types/dashboard-layout-persisted';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email || !authUser.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const parsed = dashboardLayoutPersistedSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  let dbUser;
  try {
    dbUser = await syncThenFindUser(authUser, { select: { id: true } });
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

  const layoutJson = JSON.stringify(parsed.data);
  await prisma.$executeRaw`
    UPDATE "User" SET "dashboardLayout" = ${layoutJson}::jsonb WHERE "id" = ${dbUser.id}
  `;

  return NextResponse.json({ ok: true }, { status: 200 });
}
