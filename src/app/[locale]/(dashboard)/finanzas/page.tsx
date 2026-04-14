import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getFinanceDashboardData } from '@/actions/finance';
import { Link } from '@/i18n/navigation';
import { getHubSubApps } from '@/registry/app-registry';

import FinanzasDashboardGrid from './FinanzasDashboardGrid';
import { FinanceEmptyInitialize, FinanceSyncButton } from './FinanceDashboardClient';

type PageProps = {
  params: { locale: string };
};

export default async function FinanzasPage({ params }: PageProps) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Finance');
  const data = await getFinanceDashboardData();
  const intlLocale = params.locale;
  const financeSubApps = getHubSubApps('finanzas');

  if (!data.ok) {
    return (
      <div className="flex w-full flex-col gap-8 pb-10">
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

  const {
    account,
    transactions,
    monthlyIncome,
    monthlyExpense,
    fintocAccount,
    cashFlowReport,
    dashboardLayout,
  } = data;

  return (
    <div className="flex w-full flex-col gap-8 pb-10">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#F9FAFB]">
            {t('dashboardTitle')}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{t('dashboardSubtitle')}</p>
        </div>
        <FinanceSyncButton />
      </header>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {financeSubApps.map((sub) => (
          <Link
            key={sub.id}
            href={sub.href}
            className="rounded-2xl border border-[#EAB308]/20 bg-[#0A0F1E] p-5 transition hover:border-[#EAB308]/45"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#EAB308]">
              Resumen de Sub-App
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[#F9FAFB]">{sub.label}</h2>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Canvas maestro de Finanzas: este bloque hereda directo del Blueprint.
            </p>
            <p className="mt-3 text-[11px] text-[#EAB308]/80">
              Blueprint Sync Tag: {sub.blueprintTestField ?? 'n/a'}
            </p>
          </Link>
        ))}
      </section>

      <FinanzasDashboardGrid
        locale={intlLocale}
        account={account}
        transactions={transactions}
        monthlyIncome={monthlyIncome}
        monthlyExpense={monthlyExpense}
        fintocAccount={fintocAccount}
        cashFlowReport={cashFlowReport}
        initialLayout={dashboardLayout}
        labels={{
          currentBalance: t('currentBalance'),
          baseCurrency: t('baseCurrency', { currency: account.currency }),
          monthlyIncome: t('monthlyIncome'),
          monthlyExpense: t('monthlyExpense'),
          lastMovements: t('lastMovements'),
          colDate: t('colDate'),
          colConcept: t('colConcept'),
          colType: t('colType'),
          colAmount: t('colAmount'),
          colStatus: t('colStatus'),
          noMovements: t('noMovements'),
          typeIngreso: t('typeIngreso'),
          typeEgreso: t('typeEgreso'),
          statusPendiente: t('statusPendiente'),
          statusCompletado: t('statusCompletado'),
          statusFallido: t('statusFallido'),
        }}
      />
    </div>
  );
}
