import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getFinanceDashboardData } from '@/actions/finance';
import MinimalistContextChat from '@/components/core/MinimalistContextChat';

import { FinanceEmptyInitialize, FinanceSyncButton } from './FinanceDashboardClient';
import { formatMoneyAmount } from './formatMoney';

type PageProps = {
  params: { locale: string };
};

function formatTxDate(iso: string, intlLocale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(intlLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function FinanzasPage({ params }: PageProps) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Finance');
  const data = await getFinanceDashboardData();
  const intlLocale = params.locale;

  if (!data.ok) {
    return (
      <div className="flex w-full flex-col gap-8 pb-10">
        <MinimalistContextChat appContext="finanzas" />
        <div className="rounded-2xl border border-[#334155] bg-[#111827]/80 p-8 shadow-sm backdrop-blur-sm">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[#F9FAFB]">
            {t('dashboardTitle')}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
            {data.error === 'unauthenticated' ? t('authRequired') : t('noPrismaUser')}
          </p>
        </div>
      </div>
    );
  }

  if (!data.hasAccount) {
    return (
      <div className="flex w-full flex-col gap-8 pb-10">
        <MinimalistContextChat appContext="finanzas" />
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#F9FAFB]">
            {t('dashboardTitle')}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#94A3B8]">{t('dashboardSubtitle')}</p>
        </header>

        <div className="relative overflow-hidden rounded-2xl border border-[#1E293B] bg-gradient-to-br from-[#111827] via-[#0F172A] to-[#0A0F1E] p-8 shadow-xl sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#1E3A5F]/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-[#EAB308]/10 blur-2xl" />
          <div className="relative flex max-w-xl flex-col gap-4">
            <span className="inline-flex w-fit rounded-full border border-[#334155] bg-[#0A0F1E]/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-[#EAB308]">
              {t('emptyBadge')}
            </span>
            <h2 className="font-heading text-xl font-semibold text-[#F9FAFB]">{t('emptyTitle')}</h2>
            <p className="text-sm leading-relaxed text-[#94A3B8]">{t('emptyDescription')}</p>
            <FinanceEmptyInitialize locale={params.locale} />
          </div>
        </div>
      </div>
    );
  }

  const { account, transactions, monthlyIncome, monthlyExpense } = data;

  return (
    <div className="flex w-full flex-col gap-8 pb-10">
      <MinimalistContextChat appContext="finanzas" />

      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#F9FAFB]">
            {t('dashboardTitle')}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{t('dashboardSubtitle')}</p>
        </div>
        <FinanceSyncButton />
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1 md:row-span-1">
          <div className="flex h-full min-h-[140px] flex-col justify-between rounded-2xl border border-[#1E293B] bg-gradient-to-br from-[#1E293B]/90 to-[#0F172A] p-6 shadow-lg">
            <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
              {t('currentBalance')}
            </span>
            <p className="font-data mt-3 text-3xl font-semibold tabular-nums tracking-tight text-[#F9FAFB]">
              {formatMoneyAmount(account.balance, account.currency, intlLocale)}
            </p>
            <span className="mt-2 text-xs text-[#64748B]">{t('baseCurrency', { currency: account.currency })}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1E293B] bg-[#111827]/70 p-6 shadow-md">
          <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
            {t('monthlyIncome')}
          </span>
          <p className="font-data mt-3 text-2xl font-semibold tabular-nums text-[#86EFAC]">
            {formatMoneyAmount(monthlyIncome, account.currency, intlLocale)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1E293B] bg-[#111827]/70 p-6 shadow-md">
          <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
            {t('monthlyExpense')}
          </span>
          <p className="font-data mt-3 text-2xl font-semibold tabular-nums text-[#FCA5A5]">
            {formatMoneyAmount(monthlyExpense, account.currency, intlLocale)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1E293B] bg-[#0F172A]/50 shadow-inner">
        <div className="border-b border-[#1E293B] px-6 py-4">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-[#CBD5E1]">
            {t('lastMovements')}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#0A0F1E]/60 text-xs uppercase tracking-wider text-[#94A3B8]">
                <th className="px-6 py-3 font-medium">{t('colDate')}</th>
                <th className="px-6 py-3 font-medium">{t('colConcept')}</th>
                <th className="px-6 py-3 font-medium">{t('colType')}</th>
                <th className="px-6 py-3 font-medium">{t('colAmount')}</th>
                <th className="px-6 py-3 font-medium">{t('colStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[#94A3B8]">
                    {t('noMovements')}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const dateIso = tx.bankPostedAt ?? tx.createdAt;
                  const typeLabel = tx.type === 'INGRESO' ? t('typeIngreso') : t('typeEgreso');
                  const statusLabel =
                    tx.status === 'PENDIENTE'
                      ? t('statusPendiente')
                      : tx.status === 'COMPLETADO'
                        ? t('statusCompletado')
                        : t('statusFallido');
                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-[#111827]/80">
                      <td className="whitespace-nowrap px-6 py-3 font-data text-[#E2E8F0]">
                        {formatTxDate(dateIso, intlLocale)}
                      </td>
                      <td className="max-w-[220px] truncate px-6 py-3 text-[#CBD5E1]" title={tx.concept}>
                        {tx.concept}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={
                            tx.type === 'INGRESO'
                              ? 'rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300'
                              : 'rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300'
                          }
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 font-data tabular-nums text-[#F9FAFB]">
                        {formatMoneyAmount(tx.amount, tx.currency, intlLocale)}
                      </td>
                      <td className="px-6 py-3 text-[#94A3B8]">{statusLabel}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
