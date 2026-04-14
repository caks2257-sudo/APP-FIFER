import { NextResponse } from 'next/server';

import {
  type ArchitectureHealthSnapshot,
  runArchitectureProbe,
} from '@/engines/system-health/architecture-probe';
import {
  PrismaAuthLegacyEmailConflictError,
  syncThenFindUser,
} from '@/lib/prisma-auth-sync';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';

export const dynamic = 'force-dynamic';

/**
 * Salud arquitectónica (§17) — constitución, GPS, Auto-Healing compliance. Solo admin.
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

  if (!dbUser || dbUser.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  const snapshot: ArchitectureHealthSnapshot = await runArchitectureProbe();
  return NextResponse.json(snapshot, { status: 200 });
}
