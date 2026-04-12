import { Decimal } from '@prisma/client/runtime/library';
import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import { prisma } from '@/lib/prisma';
import { transaccionSchema } from '@/types/schemas';

export const dynamic = 'force-dynamic';

function serializeTx(t: {
  id: string;
  accountId: string;
  amount: Decimal;
  currency: string;
  type: 'INGRESO' | 'EGRESO';
  concept: string;
  status: 'PENDIENTE' | 'COMPLETADO' | 'FALLIDO';
  source?: string;
  bankExternalId?: string | null;
  bankPostedAt?: Date | null;
  dteFolio?: string | null;
  dtePdfUrl?: string | null;
  dteStatus?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    accountId: t.accountId,
    amount: t.amount.toString(),
    currency: t.currency,
    type: t.type,
    concept: t.concept,
    status: t.status,
    source: t.source ?? 'manual',
    bankExternalId: t.bankExternalId ?? null,
    bankPostedAt: t.bankPostedAt?.toISOString() ?? null,
    dteFolio: t.dteFolio ?? null,
    dtePdfUrl: t.dtePdfUrl ?? null,
    dteStatus: t.dteStatus ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

/**
 * GET: `FinancialAccount` del usuario Prisma (sesión Supabase) + últimas 10 `Transaction` por `createdAt` desc.
 * Si no hay cuenta, se crea con saldo 0 y moneda CLP.
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

  if (!dbUser) {
    return NextResponse.json(
      { error: 'Usuario sin fila en Prisma; ejecute seed o sincronice identidad.' },
      { status: 404 },
    );
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
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: 'No se pudo resolver cuenta financiera' }, { status: 500 });
  }

  return NextResponse.json({
    account: {
      id: account.id,
      userId: account.userId,
      balance: account.balance.toString(),
      currency: account.currency,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    },
    transactions: account.transactions.map((t) => serializeTx(t)),
  });
}

/**
 * POST: registra una transacción y actualiza el saldo en una única transacción de base de datos.
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

  const parsed = transaccionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validación', issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { amount, type, concept } = parsed.data;

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: 'Usuario sin fila en Prisma; ejecute seed o sincronice identidad.' },
      { status: 404 },
    );
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

  const delta = new Decimal(amount);

  try {
    const { transaction, newBalance, currency } = await prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.findUnique({
        where: { userId: dbUser.id },
      });
      if (!account) {
        throw new Error('ACCOUNT_MISSING');
      }

      const nextBalance =
        type === 'INGRESO'
          ? account.balance.plus(delta)
          : account.balance.minus(delta);

      const created = await tx.transaction.create({
        data: {
          accountId: account.id,
          amount: delta,
          currency: account.currency,
          type,
          concept,
          status: 'COMPLETADO',
        },
      });

      const updated = await tx.financialAccount.update({
        where: { id: account.id },
        data: { balance: nextBalance },
      });

      return {
        transaction: created,
        newBalance: updated.balance,
        currency: updated.currency,
      };
    });

    return NextResponse.json({
      transaction: serializeTx(transaction),
      balance: newBalance.toString(),
      currency,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'ACCOUNT_MISSING') {
      return NextResponse.json({ error: 'Cuenta financiera no disponible' }, { status: 500 });
    }
    console.error('[api/v1/finanzas] POST', e);
    return NextResponse.json({ error: 'Error al registrar la transacción' }, { status: 500 });
  }
}
