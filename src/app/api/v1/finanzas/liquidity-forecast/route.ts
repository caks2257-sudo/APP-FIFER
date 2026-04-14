import { NextResponse } from 'next/server';

import '@/engines/forecast-core';

import {
  PrismaAuthLegacyEmailConflictError,
  syncThenFindUser,
} from '@/lib/prisma-auth-sync';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { EngineRegistry } from '@/registry/engine-registry';
import type { CashflowLiquiditySubEngineApi } from '@/engines/forecast-core/sub-engines/cashflow-liquidity';

export const dynamic = 'force-dynamic';

const SUB_ENGINE_ID = 'forecast-core:cashflow-liquidity' as const;

/**
 * GET: pronóstico de liquidez a 30 días (hot compute, sin persistencia).
 * Sesión Supabase → cuenta financiera → transacciones COMPLETADO → sub-motor `forecast-core:cashflow-liquidity`.
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

  if (!dbUser) {
    return NextResponse.json({ error: 'Usuario no encontrado tras sincronizar.' }, { status: 404 });
  }

  await prisma.financialAccount.upsert({
    where: { userId: dbUser.id },
    create: {
      userId: dbUser.id,
      balance: 0,
      currency: 'CLP',
    },
    update: {},
  });

  const account = await prisma.financialAccount.findUnique({
    where: { userId: dbUser.id },
    include: {
      transactions: {
        where: { status: 'COMPLETADO' },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: 'No se pudo resolver cuenta financiera' }, { status: 500 });
  }

  try {
    const engine = EngineRegistry.use<CashflowLiquiditySubEngineApi>(SUB_ENGINE_ID);
    const result = engine.runLiquidityForecast({
      account: {
        balance: account.balance.toString(),
        currency: account.currency,
      },
      transactions: account.transactions.map((t) => ({
        amount: t.amount.toString(),
        type: t.type,
        status: t.status,
        createdAt: t.createdAt,
      })),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/v1/finanzas/liquidity-forecast]', e);
    return NextResponse.json(
      { error: 'No se pudo calcular el pronóstico de liquidez', detail: msg },
      { status: 500 },
    );
  }
}
