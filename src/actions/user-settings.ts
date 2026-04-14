'use server';

import { revalidatePath } from 'next/cache';

import {
  PrismaAuthLegacyEmailConflictError,
  syncThenFindUser,
} from '@/lib/prisma-auth-sync';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { dashboardLayoutPersistedSchema } from '@/types/dashboard-layout-persisted';

type UpdateDashboardLayoutResult =
  | { ok: true }
  | { ok: false; error: 'unauthenticated' | 'no_prisma_user' | 'invalid_layout' };

export async function updateDashboardLayout(
  layout: unknown,
  revalidateTarget?: string,
): Promise<UpdateDashboardLayoutResult> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email || !authUser.id) {
    return { ok: false, error: 'unauthenticated' };
  }

  const parsed = dashboardLayoutPersistedSchema.safeParse(layout);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_layout' };
  }

  let dbUser;
  try {
    dbUser = await syncThenFindUser(authUser, { select: { id: true } });
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return { ok: false, error: 'no_prisma_user' };
    }
    throw error;
  }

  if (!dbUser) {
    return { ok: false, error: 'no_prisma_user' };
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      dashboardLayout: parsed.data,
    },
  });

  if (revalidateTarget) {
    revalidatePath(revalidateTarget);
  }

  return { ok: true };
}
