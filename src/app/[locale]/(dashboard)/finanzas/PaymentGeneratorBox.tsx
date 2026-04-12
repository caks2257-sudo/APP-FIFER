'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

type Props = {
  onCheckoutCreated?: () => void;
};

export default function PaymentGeneratorBox({ onCheckoutCreated }: Props) {
  const t = useTranslations('finanzas.checkout');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<'MOCK' | 'PROD' | null>(null);

  const generate = useCallback(async () => {
    const n = Number(amount.replace(',', '.').trim());
    if (!Number.isFinite(n) || n <= 0) {
      setError(t('amountError'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/finanzas/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amountClp: Math.round(n),
          description: description.trim() || t('defaultDescription'),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        checkoutUrl?: string;
        bridgeMode?: 'MOCK' | 'PROD';
      };
      if (!res.ok) {
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      if (!j.checkoutUrl) {
        throw new Error(t('noCheckoutUrl'));
      }
      setLastMode(j.bridgeMode ?? null);
      window.open(j.checkoutUrl, '_blank', 'noopener,noreferrer');
      onCheckoutCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('generateError'));
    } finally {
      setLoading(false);
    }
  }, [amount, description, onCheckoutCreated, t]);

  return (
    <div className="rounded-xl border border-[#EAB308]/25 bg-[#0A0F1E] p-5 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <h2 className="text-base font-semibold text-[#F9FAFB]">{t('title')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{t('description')}</p>
        </div>
        {lastMode === 'MOCK' ? (
          <span className="shrink-0 rounded border border-[#EAB308]/40 bg-[#EAB308]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#EAB308]">
            {t('mockBadge')}
          </span>
        ) : lastMode === 'PROD' ? (
          <span className="shrink-0 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
            {t('prodBadge')}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-400">
          {t('amountLabel')}
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] px-3 py-2 text-sm text-[#F9FAFB] outline-none focus:border-[#EAB308]/50 focus:ring-2 focus:ring-[#EAB308]/20"
            placeholder={t('amountPlaceholder')}
          />
        </label>
        <label className="block text-xs font-medium text-slate-400 sm:col-span-1">
          {t('descriptionLabel')}
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1629] px-3 py-2 text-sm text-[#F9FAFB] outline-none focus:border-[#EAB308]/50 focus:ring-2 focus:ring-[#EAB308]/20"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-red-300/90">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={() => void generate()}
        disabled={loading}
        className="mt-4 w-full rounded-lg border border-[#EAB308]/40 bg-[#EAB308]/15 px-4 py-2.5 text-sm font-semibold text-[#EAB308] transition hover:bg-[#EAB308]/25 disabled:opacity-50 sm:w-auto"
      >
        {loading ? t('generating') : t('generateCta')}
      </button>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{t('hint')}</p>
    </div>
  );
}
