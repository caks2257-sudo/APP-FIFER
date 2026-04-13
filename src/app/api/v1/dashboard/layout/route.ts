import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { dashboardLayoutPersistedSchema } from '@/types/dashboard-layout-persisted';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
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

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
    select: { id: true },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: 'Usuario sin fila en Prisma; ejecute seed o sincronice identidad.' },
      { status: 404 },
    );
  }

  const layoutJson = JSON.stringify(parsed.data);
  await prisma.$executeRaw`
    UPDATE "User" SET "dashboardLayout" = ${layoutJson}::jsonb WHERE "id" = ${dbUser.id}
  `;

  return NextResponse.json({ ok: true }, { status: 200 });
}
