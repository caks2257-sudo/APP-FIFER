import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import '@/engines/finance-engine';

import { loadDecryptedVault } from '@/lib/bridge-vault';
import {
  PrismaAuthLegacyEmailConflictError,
  syncThenFindUser,
} from '@/lib/prisma-auth-sync';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';
import type { PaymentsSubEngineApi } from '@/engines/finance-engine/sub-engines/payments';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  amountClp: z.coerce.number().positive(),
  description: z.string().trim().min(1).max(500),
});

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email || !authUser.id) {
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

  if (!dbUser) {
    return NextResponse.json({ error: 'Usuario no encontrado tras sincronizar.' }, { status: 404 });
  }

  await prisma.financialAccount.upsert({
    where: { userId: dbUser.id },
    create: { userId: dbUser.id, balance: 0, currency: 'CLP' },
    update: {},
  });

  const account = await prisma.financialAccount.findUnique({
    where: { userId: dbUser.id },
  });
  if (!account) {
    return NextResponse.json({ error: 'Cuenta no disponible' }, { status: 500 });
  }

  const h = headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const publicOrigin = `${proto}://${host}`;

  try {
    const vault = await loadDecryptedVault();
    const sub = EngineRegistry.use<PaymentsSubEngineApi>(
      'finance-engine:payments',
    );
    const result = await sub.createPaymentCheckout({
      prisma,
      accountId: account.id,
      amountClp: parsed.data.amountClp,
      description: parsed.data.description,
      publicOrigin,
      vault,
    });

    return NextResponse.json({
      schemaVersion: '1.0-finanzas-checkout',
      transactionId: result.transactionId,
      checkoutUrl: result.url,
      checkoutId: result.checkoutId,
      bridgeMode: result.mode,
    });
  } catch (e) {
    console.error('[api/v1/finanzas/checkout]', e);
    const msg = e instanceof Error ? e.message : 'checkout-error';
    if (msg === 'ACCOUNT_NOT_FOUND') {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
