import { NextResponse } from 'next/server';

import {
  PrismaAuthLegacyEmailConflictError,
  type PrismaUserRow,
  upsertPrismaUserFromSupabaseAuth,
} from '@/lib/prisma-auth-sync';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';

export type { PrismaUserRow };

/**
 * Supabase session + fila `User` en Prisma con `id` = UUID de Auth (RLS).
 */
export async function requirePrismaUser(): Promise<
  | { ok: true; dbUser: PrismaUserRow }
  | { ok: false; response: NextResponse }
> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email || !authUser.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    };
  }

  try {
    const dbUser = await upsertPrismaUserFromSupabaseAuth(authUser);
    return { ok: true, dbUser };
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              'Identidad desalineada: el email en la base no coincide con el UUID de Supabase Auth. Ejecute la migración de identidad (sync-uuid) o contacte a soporte.',
          },
          { status: 409 },
        ),
      };
    }
    console.error('[requirePrismaUser] Error al sincronizar usuario Prisma:', error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No se pudo sincronizar el usuario con la base de datos.' },
        { status: 500 },
      ),
    };
  }
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
