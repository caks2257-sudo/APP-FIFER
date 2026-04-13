'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { initializeFinancialModule, syncFinancialData } from '@/actions/finance';

type Props = {
  locale: string;
};

type ToastState = { kind: 'success' | 'error'; message: string } | null;

export function FinanceSyncButton() {
  const t = useTranslations('Finance');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (next: ToastState, ms = 4200) => {
    setToast(next);
    if (next) {
      window.setTimeout(() => setToast(null), ms);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    showToast(null);
    try {
      const r = await syncFinancialData();
      if (r.ok) {
        showToast({
          kind: 'success',
          message: r.mode === 'mock' ? t('syncSuccessMock') : t('syncSuccessLive'),
        });
      } else {
        let message = t('syncErrorGeneric');
        if (r.error === 'unauthenticated') {
          message = t('authRequired');
        } else if (r.error === 'no_prisma_user') {
          message = t('noPrismaUser');
        } else if (r.error === 'no_account') {
          message = t('syncErrorNoAccount');
        } else if (r.error === 'tasklet' && r.detail) {
          message = r.detail;
        }
        showToast({ kind: 'error', message });
      }
    } catch {
      showToast({ kind: 'error', message: t('syncErrorGeneric') });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <button
        type="button"
        disabled={isSyncing}
        onClick={() => void handleSync()}
        className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-[#EAB308] px-6 py-2.5 text-sm font-semibold text-[#0A0F1E] shadow-sm transition hover:bg-[#EAB308]/90 focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 focus:ring-offset-[#0A0F1E] disabled:pointer-events-none disabled:opacity-65"
      >
        {isSyncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
            <span>{t('syncInProgress')}</span>
          </>
        ) : (
          t('syncBanksSii')
        )}
      </button>
      {toast ? (
        <div
          role={toast.kind === 'error' ? 'alert' : 'status'}
          className={
            toast.kind === 'success'
              ? 'rounded-lg border border-emerald-500/35 bg-[#0f1f17] px-4 py-2 text-xs text-emerald-100 shadow-lg'
              : 'rounded-lg border border-rose-500/40 bg-[#1f1215] px-4 py-2 text-xs text-rose-100 shadow-lg'
          }
        >
          {toast.message}
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
