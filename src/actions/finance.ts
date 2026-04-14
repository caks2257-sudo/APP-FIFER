'use server';

import { revalidatePath } from 'next/cache';

import { triggerFinanceAudit } from '@/lib/integrations/tasklet';
import {
  PrismaAuthLegacyEmailConflictError,
  syncThenFindUser,
} from '@/lib/prisma-auth-sync';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import type {
  CashFlowReport,
  FintocAccount,
} from '@/components/dashboard/widgets/contracts';
import type { DashboardLayoutPersisted } from '@/types/dashboard-layout-persisted';

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
      fintocAccount: FintocAccount;
      cashFlowReport: CashFlowReport;
      dashboardLayout: DashboardLayoutPersisted | null;
    }
  | { ok: false; error: 'unauthenticated' | 'no_prisma_user' };

function monthBoundsUtcNow(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function inferInstitutionIcon(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : 'B';
}

function buildFintocAccountSimulation(args: {
  accountId: string;
  accountCurrency: string;
  currentBalance: number;
  availableBalance: number;
  lastTransactionDate: Date | null;
}): FintocAccount {
  const {
    accountId,
    accountCurrency,
    currentBalance,
    availableBalance,
    lastTransactionDate,
  } = args;
  const bankName = 'Banco Santander';
  return {
    id: `fintoc_${accountId}`,
    name: 'Cuenta Corriente Empresa',
    number: `0000${accountId.slice(-4)}`,
    currency: (accountCurrency === 'USD' || accountCurrency === 'EUR'
      ? accountCurrency
      : 'CLP') as FintocAccount['currency'],
    officialName: 'Santander Empresas',
    institution: {
      id: 'santander_cl',
      name: bankName,
      iconInitial: inferInstitutionIcon(bankName),
    },
    balance: {
      current: Math.round(currentBalance),
      available: Math.round(availableBalance),
    },
    lastSyncAt: lastTransactionDate ? `Actualizado ${lastTransactionDate.toLocaleDateString('es-CL')}` : 'Actualizado hoy',
    syncStatus: 'SYNCED',
  };
}

function buildCashFlowReportSimulation(args: {
  currency: string;
  monthlyIncome: number;
  monthlyExpense: number;
  transactionsCount: number;
}): CashFlowReport {
  const now = new Date();
  const periodLabel = now.toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });
  return {
    periodLabel: `${periodLabel[0]?.toUpperCase() ?? ''}${periodLabel.slice(1)}`,
    currency: (args.currency === 'USD' || args.currency === 'EUR'
      ? args.currency
      : 'CLP') as CashFlowReport['currency'],
    ingresosDte: {
      projectedAmount: Math.round(args.monthlyIncome),
      documentCount: Math.max(1, Math.ceil(args.transactionsCount / 2)),
    },
    egresosFacturas: {
      payableAmount: Math.round(args.monthlyExpense),
      documentCount: Math.max(1, Math.floor(args.transactionsCount / 2)),
    },
  };
}

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !user.id) {
    return { ok: false, error: 'unauthenticated' };
  }

  let dbUser;
  try {
    dbUser = await syncThenFindUser(user);
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return { ok: false, error: 'no_prisma_user' };
    }
    throw error;
  }

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

  const monthlyIncomeNumber = Number(monthlyIncome);
  const monthlyExpenseNumber = Number(monthlyExpense);
  const currentBalance = Number(account.balance);
  const availableBalance = Math.max(0, currentBalance - monthlyExpenseNumber * 0.08);
  const lastTransactionDate = account.transactions[0]?.createdAt ?? null;
  const fintocAccount = buildFintocAccountSimulation({
    accountId: account.id,
    accountCurrency: account.currency,
    currentBalance,
    availableBalance,
    lastTransactionDate,
  });
  const cashFlowReport = buildCashFlowReportSimulation({
    currency: account.currency,
    monthlyIncome: monthlyIncomeNumber,
    monthlyExpense: monthlyExpenseNumber,
    transactionsCount: account.transactions.length,
  });

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
    fintocAccount,
    cashFlowReport,
    dashboardLayout: (dbUser.dashboardLayout as DashboardLayoutPersisted | null) ?? null,
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

  if (!user?.email || !user.id) {
    return { ok: false, error: 'unauthenticated' };
  }

  let dbUser;
  try {
    dbUser = await syncThenFindUser(user);
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return { ok: false, error: 'no_prisma_user' };
    }
    throw error;
  }

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

export type SyncFinancialDataResult =
  | { ok: true; mode: 'mock' | 'live' }
  | {
      ok: false;
      error: 'unauthenticated' | 'no_prisma_user' | 'no_account' | 'tasklet';
      detail?: string;
    };

export async function syncFinancialData(): Promise<SyncFinancialDataResult> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email || !user.id) {
      return { ok: false, error: 'unauthenticated' };
    }

    let dbUser;
    try {
      dbUser = await syncThenFindUser(user);
    } catch (error) {
      if (error instanceof PrismaAuthLegacyEmailConflictError) {
        return { ok: false, error: 'no_prisma_user' };
      }
      throw error;
    }

    if (!dbUser) {
      return { ok: false, error: 'no_prisma_user' };
    }

    const account = await prisma.financialAccount.findUnique({
      where: { userId: dbUser.id },
    });

    if (!account) {
      return { ok: false, error: 'no_account' };
    }

    const result = await triggerFinanceAudit(account.id);

    if (!result.ok) {
      return { ok: false, error: 'tasklet', detail: result.error };
    }

    return { ok: true, mode: result.mode };
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'syncFinancialData failed';
    return { ok: false, error: 'tasklet', detail };
  }
}
