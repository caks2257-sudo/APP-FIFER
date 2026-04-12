import { NextResponse } from 'next/server';

import {
  type ArchitectureHealthSnapshot,
  runArchitectureProbe,
} from '@/engines/system-health/architecture-probe';
import { prisma } from '@/lib/prisma';
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

  if (!authUser?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
  });
  if (!dbUser || dbUser.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  const snapshot: ArchitectureHealthSnapshot = await runArchitectureProbe();
  return NextResponse.json(snapshot, { status: 200 });
}
