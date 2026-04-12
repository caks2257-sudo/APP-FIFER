import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** PDF mínimo válido para descarga simulada (DTE mock). */
const MIN_PDF = Buffer.from(
  [
    '%PDF-1.1',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj',
    'trailer<</Root 1 0 R>>',
    '%%EOF',
  ].join('\n'),
  'utf8',
);

/**
 * Descarga del PDF simulado asociado a una transacción con DTE emitido (sesión requerida).
 */
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const txId = request.nextUrl.searchParams.get('tx');
  if (!txId?.trim()) {
    return NextResponse.json({ error: 'Falta tx' }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
  });
  if (!dbUser) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const row = await prisma.transaction.findFirst({
    where: {
      id: txId,
      account: { userId: dbUser.id },
      dteStatus: 'emitido',
    },
  });

  if (!row?.dteFolio) {
    return NextResponse.json({ error: 'Documento no disponible' }, { status: 404 });
  }

  const name = `dte-folio-${row.dteFolio}.pdf`;

  return new NextResponse(MIN_PDF, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
