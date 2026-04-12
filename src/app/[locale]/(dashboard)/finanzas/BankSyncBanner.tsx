'use client';

import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

type SyncPreview = {
  pendingCount: number;
  bridgeMode: 'MOCK' | 'PROD';
  newMovements: Array<{ externalId: string; concept: string; amountClp: number }>;
};

type Props = {
  onSynced: () => Promise<void>;
};

export default function BankSyncBanner({ onSynced }: Props) {
  const locale = useLocale();
  const t = useTranslations('finanzas.bankSync');
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/finanzas/sync-bank', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as SyncPreview & { pendingCount?: number };
      setPreview({
        pendingCount: data.pendingCount ?? 0,
        bridgeMode: data.bridgeMode,
        newMovements: data.newMovements ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('fetchError'));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/finanzas/sync-bank', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      await onSynced();
      await loadPreview();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('syncError'));
    } finally {
      setSyncing(false);
    }
  }, [loadPreview, onSynced, t]);

  if (loading) {
    return null;
  }

  if (error && !preview) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-[#111827] px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  if (preview.pendingCount === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-[#EAB308]/20 bg-[#0A0F1E] px-4 py-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          {preview.bridgeMode === 'MOCK' ? (
            <span className="rounded border border-[#EAB308]/40 bg-[#EAB308]/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-[#EAB308]">
              {t('mockBadge')}
            </span>
          ) : null}
          <span className="min-w-0 leading-relaxed">{t('upToDate')}</span>
        </div>
        {error ? <p className="text-red-300/90">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#EAB308]/35 bg-gradient-to-r from-[#0A0F1E] to-[#111827] p-4 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.12)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-[#F9FAFB]">{t('title')}</h2>
            {preview.bridgeMode === 'MOCK' ? (
              <span className="rounded border border-[#EAB308]/40 bg-[#EAB308]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#EAB308]">
                {t('mockBadge')}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            {t('pendingLine', { count: preview.pendingCount })}
          </p>
          {preview.newMovements.length > 0 ? (
            <ul className="mt-2 max-h-24 list-inside list-disc overflow-y-auto text-xs text-slate-400">
              {preview.newMovements.slice(0, 5).map((m) => (
                <li key={m.externalId}>
                  {m.concept}{' '}
                  <span className="font-mono text-slate-300">
                    ({m.amountClp.toLocaleString(locale)} {t('clpSuffix')})
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing || preview.pendingCount === 0}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#EAB308]/50 bg-[#EAB308]/15 px-5 py-2.5 text-sm font-semibold text-[#EAB308] transition hover:bg-[#EAB308]/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing ? t('syncing') : t('syncNow')}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-300/90">{error}</p>
      ) : null}
    </div>
  );
}
