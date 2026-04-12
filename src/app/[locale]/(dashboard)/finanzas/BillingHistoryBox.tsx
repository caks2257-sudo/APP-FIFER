'use client';

import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import type { FinanzasTransactionJson } from './useFinanzas';

type Props = {
  transactions: FinanzasTransactionJson[];
  loading: boolean;
  onRefresh: () => Promise<void>;
};

export default function BillingHistoryBox({
  transactions,
  loading,
  onRefresh,
}: Props) {
  const locale = useLocale();
  const t = useTranslations('finanzas.billing');

  function dteLabel(tx: FinanzasTransactionJson): { text: string; tone: string } {
    if (tx.type !== 'INGRESO' || tx.status !== 'COMPLETADO') {
      return { text: t('dteEmpty'), tone: 'text-slate-500' };
    }
    if (tx.dteStatus === 'emitido' && tx.dteFolio) {
      return { text: t('dteIssued', { folio: tx.dteFolio }), tone: 'text-emerald-300' };
    }
    if (tx.dteStatus === 'pendiente') {
      return { text: t('dtePending'), tone: 'text-amber-200' };
    }
    if (tx.dteStatus === 'error') {
      return { text: t('dteError'), tone: 'text-red-300' };
    }
    return { text: t('dteNone'), tone: 'text-slate-400' };
  }
  const [emittingId, setEmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emitManual = useCallback(
    async (transactionId: string) => {
      setError(null);
      setEmittingId(transactionId);
      try {
        const res = await fetch('/api/v1/finanzas/billing/emit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ transactionId }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string; skipped?: boolean };
        if (!res.ok) {
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        await onRefresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t('emitError'));
      } finally {
        setEmittingId(null);
      }
    },
    [onRefresh, t],
  );

  const ingresos = transactions.filter((t) => t.type === 'INGRESO');

  return (
    <div className="rounded-xl border border-[#EAB308]/20 bg-[#0A0F1E] p-5 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 max-w-3xl">
          <h2 className="text-base font-semibold text-[#F9FAFB]">{t('title')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{t('description')}</p>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-red-300/90">{error}</p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">{t('loading')}</p>
      ) : ingresos.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{t('noIncome')}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10">
          {ingresos.map((tx) => {
            const lbl = dteLabel(tx);
            const canManualEmit =
              tx.status === 'COMPLETADO' &&
              tx.type === 'INGRESO' &&
              !tx.dteFolio &&
              (tx.dteStatus == null || tx.dteStatus === 'error') &&
              ((tx.source ?? 'manual') !== 'payment_checkout' || tx.dteStatus === 'error');
            const canDownload =
              tx.dteStatus === 'emitido' && tx.dtePdfUrl && tx.dteFolio;

            return (
              <li
                key={tx.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#F9FAFB]">{tx.concept}</p>
                  <p className="font-mono text-xs text-slate-500">{tx.id}</p>
                  <p className={`mt-1 break-words text-xs font-medium ${lbl.tone}`}>{lbl.text}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#EAB308]">
                    {Number(tx.amount).toLocaleString(locale)} {tx.currency}
                  </span>
                  {canDownload ? (
                    <a
                      href={`/api/v1/finanzas/billing/mock-pdf?tx=${encodeURIComponent(tx.id)}`}
                      className="rounded-lg border border-[#EAB308]/40 bg-[#EAB308]/10 px-3 py-1.5 text-xs font-semibold text-[#EAB308] hover:bg-[#EAB308]/20"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('downloadPdf')}
                    </a>
                  ) : null}
                  {canManualEmit ? (
                    <button
                      type="button"
                      disabled={emittingId === tx.id}
                      onClick={() => void emitManual(tx.id)}
                      className="rounded-lg border border-white/15 bg-[#1E293B] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-[#334155] disabled:opacity-50"
                    >
                      {emittingId === tx.id ? t('emitting') : t('emitInvoice')}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
