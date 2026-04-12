'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import SmartInsightWidget from '@/components/core/SmartInsightWidget';

import BankSyncBanner from './BankSyncBanner';
import BalanceCard from './BalanceCard';
import BillingHistoryBox from './BillingHistoryBox';
import PaymentGeneratorBox from './PaymentGeneratorBox';
import LiquidityForecastBox from './LiquidityForecastBox';
import NewTransactionModal from './NewTransactionModal';
import TransactionList from './TransactionList';
import { useFinanzas } from './useFinanzas';
import { useLiquidityForecast } from './useLiquidityForecast';

export default function FinanzasPage() {
  const t = useTranslations('finanzas.hub');
  const { account, transactions, loading, error, refetch, crearTransaccion } = useFinanzas();
  const liquidity = useLiquidityForecast();
  const [modalOpen, setModalOpen] = useState(false);

  const balance = account?.balance ?? '0';
  const currency = account?.currency ?? 'CLP';

  return (
    <BoxErrorBoundary>
      <div className="flex w-full flex-col gap-8 pb-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-3xl">
            <h1 className="text-2xl font-semibold tracking-tight text-[#F9FAFB]">{t('title')}</h1>
            <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{t('subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex min-h-[2.75rem] shrink-0 items-center justify-center rounded-lg bg-[#EAB308] px-5 py-2.5 text-sm font-semibold text-[#0A0F1E] shadow-sm transition hover:bg-[#EAB308]/90 focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 focus:ring-offset-[#0A0F1E]"
          >
            {t('registerCta')}
          </button>
        </header>

        {error && (
          <div className="rounded-lg border border-amber-500/30 bg-[#111827] px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        )}

        <BankSyncBanner
          onSynced={async () => {
            await refetch();
            await liquidity.refetch();
          }}
        />

        <PaymentGeneratorBox
          onCheckoutCreated={async () => {
            await refetch();
            await liquidity.refetch();
          }}
        />

        <BillingHistoryBox
          transactions={transactions}
          loading={loading}
          onRefresh={async () => {
            await refetch();
            await liquidity.refetch();
          }}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <BalanceCard balance={balance} currency={currency} loading={loading} />
          <BoxErrorBoundary>
            <LiquidityForecastBox
              data={liquidity.data}
              loading={liquidity.loading}
              error={liquidity.error}
            />
          </BoxErrorBoundary>
        </div>

        <TransactionList transactions={transactions} currency={currency} loading={loading} />

        <section className="border-t border-[#1E293B] pt-8">
          <SmartInsightWidget
            moduleId="finanzas"
            boxId="finanzas-page"
            contextData={{}}
            systemInstruction={t('insightInstruction')}
          />
        </section>
      </div>

      <NewTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (payload) => {
          const r = await crearTransaccion(payload);
          if (r.ok) {
            await refetch();
            await liquidity.refetch();
            return { ok: true };
          }
          return { ok: false, message: r.message };
        }}
      />
    </BoxErrorBoundary>
  );
}
