'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';

type ListItem = {
  id: string;
  formType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function ExpedientesSkeleton() {
  return (
    <div className="mt-4 space-y-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-lg bg-[#111827]/80 ring-1 ring-[#1E293B]/80"
        />
      ))}
    </div>
  );
}

export default function ExpedientesActivosBox() {
  const t = useTranslations('dom.hub.expedientesActivos');
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/v1/dom/expedientes', {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: ListItem[];
      };
      if (res.status === 401) {
        setError(t('errorAuth'));
        setItems([]);
        return;
      }
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : t('errorGeneric'));
        setItems([]);
        return;
      }
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch {
      setError(t('errorNetwork'));
      setItems([]);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener('dom-expedientes-changed', onChange);
    return () => window.removeEventListener('dom-expedientes-changed', onChange);
  }, [load]);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  const labelFormType = (ft: string) => {
    if (ft === 'minvu-2.1-edificacion') return t('formType21');
    return ft;
  };

  const labelStatus = (s: string) => {
    if (s === 'DRAFT') return t('statusDraft');
    if (s === 'SUBMITTED') return t('statusSubmitted');
    return s;
  };

  return (
    <BoxErrorBoundary>
      <section className="rounded-xl border border-[#1E293B] bg-[#0A0F1E]/90 p-6 shadow-[inset_0_1px_0_0_rgba(234,179,8,0.06)]">
        <h2 className="text-lg font-semibold tracking-tight text-[#F9FAFB]">{t('title')}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#94A3B8]">{t('subtitle')}</p>

        {error ? (
          <p className="mt-4 text-sm text-amber-400/95" role="alert">
            {error}
          </p>
        ) : null}

        {items === null ? (
          <ExpedientesSkeleton />
        ) : items.length === 0 && !error ? (
          <p className="mt-4 text-sm text-[#64748B]">{t('empty')}</p>
        ) : items.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[#1E293B] bg-[#111827]/30">
            <table className="w-full min-w-[320px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#1E293B] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  <th className="px-3 py-2.5">{t('colForm')}</th>
                  <th className="px-3 py-2.5">{t('colDate')}</th>
                  <th className="px-3 py-2.5">{t('colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#1E293B]/80 last:border-0 hover:bg-[#111827]/50"
                  >
                    <td className="px-3 py-2.5 font-mono text-[12px] text-[#EAB308]/90">
                      {labelFormType(row.formType)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-[#94A3B8]">{fmtDate(row.createdAt)}</td>
                    <td className="px-3 py-2.5 text-[#F9FAFB]">{labelStatus(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </BoxErrorBoundary>
  );
}
