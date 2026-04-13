'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';

export type FinanceTransactionRow = {
  id: string;
  amount: string;
  currency: string;
  type: 'INGRESO' | 'EGRESO';
  concept: string;
  status: 'PENDIENTE' | 'COMPLETADO' | 'FALLIDO';
  createdAt: string;
  bankPostedAt: string | null;
};

export type FinanceAccountRow = {
  id: string;
  balance: string;
  currency: string;
};

export type FinanceDashboardData =
  | { ok: true; hasAccount: false }
  | {
      ok: true;
      hasAccount: true;
      account: FinanceAccountRow;
      transactions: FinanceTransactionRow[];
      monthlyIncome: string;
      monthlyExpense: string;
    }
  | { ok: false; error: 'unauthenticated' | 'no_prisma_user' };

function monthBoundsUtcNow(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: 'unauthenticated' };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    return { ok: false, error: 'no_prisma_user' };
  }

  const account = await prisma.financialAccount.findUnique({
    where: { userId: dbUser.id },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!account) {
    return { ok: true, hasAccount: false };
  }

  const { start, end } = monthBoundsUtcNow();

  const sums = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      accountId: account.id,
      createdAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });

  let monthlyIncome = '0';
  let monthlyExpense = '0';
  for (const row of sums) {
    const total = row._sum.amount?.toString() ?? '0';
    if (row.type === 'INGRESO') {
      monthlyIncome = total;
    } else if (row.type === 'EGRESO') {
      monthlyExpense = total;
    }
  }

  return {
    ok: true,
    hasAccount: true,
    account: {
      id: account.id,
      balance: account.balance.toString(),
      currency: account.currency,
    },
    transactions: account.transactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount.toString(),
      currency: tx.currency,
      type: tx.type,
      concept: tx.concept,
      status: tx.status,
      createdAt: tx.createdAt.toISOString(),
      bankPostedAt: tx.bankPostedAt?.toISOString() ?? null,
    })),
    monthlyIncome,
    monthlyExpense,
  };
}

export type InitializeFinanceResult =
  | { ok: true }
  | { ok: false; error: 'unauthenticated' | 'no_prisma_user' };

export async function initializeFinancialModule(
  locale: string,
): Promise<InitializeFinanceResult> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: 'unauthenticated' };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (!dbUser) {
    return { ok: false, error: 'no_prisma_user' };
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

  revalidatePath(`/${locale}/finanzas`);
  return { ok: true };
}
