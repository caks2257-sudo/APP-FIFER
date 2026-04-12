import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import '@/engines/finance-engine';

import { loadDecryptedVault } from '@/lib/bridge-vault';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';
import type { BillingSubEngineApi } from '@/engines/finance-engine/sub-engines/billing';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  transactionId: z.string().min(1),
});

/**
 * Emisión manual de DTE para movimientos COMPLETADOS sin factura (ej. depósitos directos).
 */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
  });
  if (!dbUser) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const owned = await prisma.transaction.findFirst({
    where: {
      id: parsed.data.transactionId,
      account: { userId: dbUser.id },
    },
  });
  if (!owned) {
    return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
  }

  try {
    const vault = await loadDecryptedVault();
    const sub = EngineRegistry.use<BillingSubEngineApi>('finance-engine:billing');
    const out = await sub.emitInvoiceForTransaction(
      prisma,
      parsed.data.transactionId,
      vault,
      { onlyPaymentCheckout: false },
    );

    if (!out.ok) {
      return NextResponse.json(
        { error: out.reason ?? 'No se pudo emitir' },
        { status: 400 },
      );
    }

    if (out.skipped) {
      return NextResponse.json({
        schemaVersion: '1.0-finanzas-billing-emit',
        ok: true,
        skipped: true,
        reason: out.reason,
      });
    }

    return NextResponse.json({
      schemaVersion: '1.0-finanzas-billing-emit',
      ...out,
    });
  } catch (e) {
    console.error('[api/v1/finanzas/billing/emit]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'emit-error' },
      { status: 500 },
    );
  }
}
