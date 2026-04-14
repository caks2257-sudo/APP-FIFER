import type { Prisma } from '@prisma/client';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

import { prisma } from '@/lib/prisma';

export type PrismaUserRow = {
  id: string;
  email: string;
  role: string;
  tier: string;
};

/**
 * Conflicto: existe una fila `User` con el mismo email pero `id` distinto al UUID de Supabase Auth
 * (p. ej. legado con cuid). Requiere migración manual (ver `src/scripts/sync-uuid-admin.ts`).
 */
export class PrismaAuthLegacyEmailConflictError extends Error {
  constructor() {
    super(
      'Email en Prisma vinculado a un id distinto del UUID de Supabase Auth; ejecute migración de identidad.',
    );
    this.name = 'PrismaAuthLegacyEmailConflictError';
  }
}

function displayNameFromAuth(authUser: SupabaseAuthUser): string {
  const meta = authUser.user_metadata as Record<string, unknown> | undefined;
  const fromFull =
    typeof meta?.full_name === 'string' && meta.full_name.trim() ? meta.full_name.trim() : '';
  const fromName = typeof meta?.name === 'string' && meta.name.trim() ? meta.name.trim() : '';
  const email = authUser.email ?? '';
  const local = email.includes('@') ? email.split('@')[0] : '';
  return fromFull || fromName || local || 'Usuario';
}

/**
 * Garantiza que `public.User.id` === `auth.users.id` (UUID) para que RLS (`auth.uid()::text`) coincida.
 * Usar tras `supabase.auth.getUser()` en servidor.
 */
export async function upsertPrismaUserFromSupabaseAuth(
  authUser: SupabaseAuthUser,
): Promise<PrismaUserRow> {
  const email = authUser.email?.trim() ?? '';
  if (!email) {
    throw new Error('Usuario de Supabase sin email');
  }
  if (!authUser.id) {
    throw new Error('Usuario de Supabase sin id');
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail && existingByEmail.id !== authUser.id) {
    throw new PrismaAuthLegacyEmailConflictError();
  }

  const name = displayNameFromAuth(authUser);

  return prisma.user.upsert({
    where: { id: authUser.id },
    create: {
      id: authUser.id,
      email,
      name,
      role: 'user',
      tier: 'free',
    },
    update: {
      email,
    },
    select: { id: true, email: true, role: true, tier: true },
  });
}

/**
 * Upsert por UUID Auth + carga la fila `User` con el mismo criterio que el resto de APIs.
 */
export async function syncThenFindUser(
  authUser: SupabaseAuthUser,
  args?: Omit<Prisma.UserFindUniqueArgs, 'where'>,
) {
  await upsertPrismaUserFromSupabaseAuth(authUser);
  return prisma.user.findUnique({
    where: { id: authUser.id },
    ...args,
  });
}
