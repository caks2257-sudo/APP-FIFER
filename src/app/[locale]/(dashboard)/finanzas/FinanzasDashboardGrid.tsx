'use client';

import { useMemo } from 'react';

import { updateDashboardLayout } from '@/actions/user-settings';
import DashboardCanvas from '@/components/dashboard/DashboardCanvas';
import type {
  CashFlowReport,
  FintocAccount,
} from '@/components/dashboard/widgets/contracts';
import type { DashboardLayoutPersisted } from '@/types/dashboard-layout-persisted';

import type { FinanceAccountRow, FinanceTransactionRow } from '@/actions/finance';
import { formatMoneyAmount } from './formatMoney';

type FinanceDashboardLabels = {
  currentBalance: string;
  baseCurrency: string;
  monthlyIncome: string;
  monthlyExpense: string;
  lastMovements: string;
  colDate: string;
  colConcept: string;
  colType: string;
  colAmount: string;
  colStatus: string;
  noMovements: string;
  typeIngreso: string;
  typeEgreso: string;
  statusPendiente: string;
  statusCompletado: string;
  statusFallido: string;
};

type FinanzasDashboardGridProps = {
  locale: string;
  labels: FinanceDashboardLabels;
  account: FinanceAccountRow;
  transactions: FinanceTransactionRow[];
  monthlyIncome: string;
  monthlyExpense: string;
  fintocAccount: FintocAccount;
  cashFlowReport: CashFlowReport;
  initialLayout: DashboardLayoutPersisted | null;
};

function formatTxDate(iso: string, intlLocale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(intlLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function FinanzasDashboardGrid({
  locale,
  labels,
  account,
  transactions,
  monthlyIncome,
  monthlyExpense,
  fintocAccount,
  cashFlowReport,
  initialLayout,
}: FinanzasDashboardGridProps) {
  const widgets = useMemo(
    () => [
      {
        id: 'finance-balance',
        defaultLayout: { x: 0, y: 0, w: 4, h: 2 },
        children: ({ w, h }: { w: number; h: number }) => (
          <article className="h-full rounded-2xl border border-[#EAB308]/25 bg-[#0A0F1E] p-6 shadow-[0_0_0_1px_rgba(234,179,8,0.08)]">
            <div className="widget-handle mb-3 cursor-move text-[11px] font-semibold uppercase tracking-[0.18em] text-[#EAB308]">
              {labels.currentBalance}
            </div>
            <p className="font-data text-3xl font-semibold text-[#F9FAFB]">
              {formatMoneyAmount(account.balance, account.currency, locale)}
            </p>
            <p className="mt-2 text-xs text-[#EAB308]/90">{labels.baseCurrency}</p>
            <p className="mt-3 text-xs text-[#EAB308]/70">{`w:${w} h:${h}`}</p>
          </article>
        ),
      },
      {
        id: 'finance-income',
        defaultLayout: { x: 4, y: 0, w: 4, h: 2 },
        children: ({ w, h }: { w: number; h: number }) => (
          <article className="h-full rounded-2xl border border-[#EAB308]/20 bg-[#0A0F1E] p-6">
            <div className="widget-handle mb-3 cursor-move text-[11px] font-semibold uppercase tracking-[0.18em] text-[#EAB308]">
              {labels.monthlyIncome}
            </div>
            <p className="font-data text-2xl font-semibold text-[#F9FAFB]">
              {formatMoneyAmount(monthlyIncome, account.currency, locale)}
            </p>
            <p className="mt-3 text-xs text-[#EAB308]/70">{`w:${w} h:${h}`}</p>
          </article>
        ),
      },
      {
        id: 'finance-expense',
        defaultLayout: { x: 8, y: 0, w: 4, h: 2 },
        children: ({ w, h }: { w: number; h: number }) => (
          <article className="h-full rounded-2xl border border-[#EAB308]/20 bg-[#0A0F1E] p-6">
            <div className="widget-handle mb-3 cursor-move text-[11px] font-semibold uppercase tracking-[0.18em] text-[#EAB308]">
              {labels.monthlyExpense}
            </div>
            <p className="font-data text-2xl font-semibold text-[#F9FAFB]">
              {formatMoneyAmount(monthlyExpense, account.currency, locale)}
            </p>
            <p className="mt-3 text-xs text-[#EAB308]/70">{`w:${w} h:${h}`}</p>
          </article>
        ),
      },
      {
        id: 'finance-transactions',
        defaultLayout: { x: 0, y: 2, w: 12, h: 4 },
        children: () => (
          <article className="h-full rounded-2xl border border-[#EAB308]/20 bg-[#0A0F1E]">
            <div className="widget-handle cursor-move border-b border-[#EAB308]/20 px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#EAB308]">
              {labels.lastMovements}
            </div>
            <div className="h-[calc(100%-3.25rem)] overflow-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#EAB308]/10 text-xs uppercase tracking-wider text-[#EAB308]/80">
                    <th className="px-6 py-3 font-medium">{labels.colDate}</th>
                    <th className="px-6 py-3 font-medium">{labels.colConcept}</th>
                    <th className="px-6 py-3 font-medium">{labels.colType}</th>
                    <th className="px-6 py-3 font-medium">{labels.colAmount}</th>
                    <th className="px-6 py-3 font-medium">{labels.colStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAB308]/10">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-[#F9FAFB]/80">
                        {labels.noMovements}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const dateIso = tx.bankPostedAt ?? tx.createdAt;
                      const typeLabel = tx.type === 'INGRESO' ? labels.typeIngreso : labels.typeEgreso;
                      const statusLabel =
                        tx.status === 'PENDIENTE'
                          ? labels.statusPendiente
                          : tx.status === 'COMPLETADO'
                            ? labels.statusCompletado
                            : labels.statusFallido;
                      return (
                        <tr key={tx.id} className="hover:bg-[#EAB308]/5">
                          <td className="whitespace-nowrap px-6 py-3 font-data text-[#F9FAFB]">
                            {formatTxDate(dateIso, locale)}
                          </td>
                          <td className="max-w-[260px] truncate px-6 py-3 text-[#F9FAFB]/90" title={tx.concept}>
                            {tx.concept}
                          </td>
                          <td className="px-6 py-3">
                            <span className="rounded-md border border-[#EAB308]/40 bg-[#EAB308]/10 px-2 py-0.5 text-xs font-medium text-[#EAB308]">
                              {typeLabel}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-3 font-data tabular-nums text-[#F9FAFB]">
                            {formatMoneyAmount(tx.amount, tx.currency, locale)}
                          </td>
                          <td className="px-6 py-3 text-[#F9FAFB]/80">{statusLabel}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>
        ),
      },
    ],
    [account.balance, account.currency, labels, locale, monthlyExpense, monthlyIncome, transactions],
  );

  return (
    <DashboardCanvas
      className="w-full"
      initialLayout={initialLayout}
      widgets={widgets}
      fintocData={fintocAccount}
      cashflowData={cashFlowReport}
      onPersist={async (layout) => {
        await updateDashboardLayout(layout, `/${locale}/finanzas`);
      }}
    />
  );
}
