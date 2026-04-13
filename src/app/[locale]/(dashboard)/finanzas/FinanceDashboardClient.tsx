'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { initializeFinancialModule } from '@/actions/finance';

type Props = {
  locale: string;
};

export function FinanceSyncButton() {
  const t = useTranslations('Finance');
  const [toast, setToast] = useState(false);

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <button
        type="button"
        onClick={() => {
          console.log('[Finance MVP] Sincronizar Bancos/SII (stub)');
          setToast(true);
          window.setTimeout(() => setToast(false), 2800);
        }}
        className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-[#EAB308] px-6 py-2.5 text-sm font-semibold text-[#0A0F1E] shadow-sm transition hover:bg-[#EAB308]/90 focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 focus:ring-offset-[#0A0F1E]"
      >
        {t('syncBanksSii')}
      </button>
      {toast ? (
        <div
          role="status"
          className="rounded-lg border border-[#334155] bg-[#111827] px-4 py-2 text-xs text-[#E2E8F0] shadow-lg"
        >
          {t('syncToastMessage')}
        </div>
      ) : null}
    </div>
  );
}

export function FinanceEmptyInitialize({ locale }: Props) {
  const t = useTranslations('Finance');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      {error ? (
        <p className="text-sm text-amber-200/90" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await initializeFinancialModule(locale);
            if (!r.ok) {
              setError(
                r.error === 'unauthenticated' ? t('authRequired') : t('noPrismaUser'),
              );
            }
          });
        }}
        className="inline-flex min-h-[2.75rem] w-fit items-center justify-center rounded-xl bg-[#EAB308] px-6 py-2.5 text-sm font-semibold text-[#0A0F1E] shadow-sm transition hover:bg-[#EAB308]/90 focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 focus:ring-offset-[#0A0F1E] disabled:opacity-60"
      >
        {pending ? t('initializing') : t('emptyCta')}
      </button>
    </div>
  );
}
