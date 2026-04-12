import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';

export type PrismaUserRow = { id: string; email: string };

/**
 * Supabase session + fila `User` en Prisma. Mismos códigos que `init/route.ts`.
 */
export async function requirePrismaUser(): Promise<
  | { ok: true; dbUser: PrismaUserRow }
  | { ok: false; response: NextResponse }
> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  if (!dbUser) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Usuario sin fila en Prisma; sincronice la identidad.' },
        { status: 404 },
      ),
    };
  }

  return { ok: true, dbUser };
}

/**
 * Comprueba que la sesión AODS pertenezca al usuario (anti IDOR).
 */
export async function assertAodsSessionOwned(
  sessionId: string,
  ownerId: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const row = await prisma.aodsSession.findFirst({
    where: { id: sessionId, ownerId },
    select: { id: true },
  });

  if (!row) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Sesión no encontrada o sin permiso.' },
        { status: 404 },
      ),
    };
  }

  return { ok: true };
}

/** Si el body envía `ownerId`, debe coincidir con el usuario autenticado. */
export function rejectMismatchedOwnerId(
  ownerIdFromBody: string | undefined,
  dbUserId: string,
): NextResponse | null {
  if (ownerIdFromBody !== undefined && ownerIdFromBody !== dbUserId) {
    return NextResponse.json(
      { error: 'ownerId no coincide con el usuario autenticado.' },
      { status: 403 },
    );
  }
  return null;
}
