'use client';

import type { ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';

import type { DomAnalisisResponse } from '@/types/schemas';

type Props = {
  result: DomAnalisisResponse | null;
  error: string | null;
};

function formatObservaciones(obs: string | string[]): ReactNode {
  if (Array.isArray(obs)) {
    return (
      <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed">
        {obs.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    );
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{obs}</p>;
}

export default function ReporteFactibilidad({ result, error }: Props) {
  const locale = useLocale();
  const t = useTranslations('dom.normativa.report');

  if (error) {
    return (
      <div
        className="rounded-xl border border-red-900/50 bg-[#1c0f0f]/90 p-5 text-sm text-red-100/90"
        role="alert"
      >
        <p className="font-semibold text-red-200/95">{t('errorTitle')}</p>
        <p className="mt-2 text-red-100/80">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-[#1E293B] bg-[#0A0F1E]/80 p-8 text-center text-sm text-[#64748B]">
        {t('empty')}
      </div>
    );
  }

  const alerta = !result.factible;

  return (
    <div
      className={`rounded-xl border p-6 ${
        alerta
          ? 'border-[#9a3412]/50 bg-[#1a100c]/95 text-[#fecaca]/95'
          : 'border-[#1E293B] bg-[#0A0F1E] text-[#E2E8F0]'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#F9FAFB]">{t('title')}</h2>
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
            result.factible
              ? 'bg-emerald-950/60 text-emerald-200/90 ring-1 ring-emerald-800/40'
              : 'bg-[#7c2d12]/40 text-[#fdba74]/95 ring-1 ring-[#9a3412]/45'
          }`}
        >
          {result.factible ? t('factible') : t('notFactible')}
        </span>
      </div>

      <p className="mt-4 text-sm text-[#94A3B8]">{t('superficieLabel')}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#F9FAFB]">
        {Number.isFinite(result.superficieMaximaEdificable)
          ? `${result.superficieMaximaEdificable.toLocaleString(locale, { maximumFractionDigits: 2 })} m²`
          : '—'}
      </p>

      <div
        className={`mt-6 border-t pt-5 ${
          alerta ? 'border-[#9a3412]/35' : 'border-[#1E293B]'
        }`}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
          {t('observations')}
        </h3>
        <div
          className={`mt-3 ${alerta ? 'text-[#fecaca]/90' : 'text-[#CBD5E1]'}`}
        >
          {formatObservaciones(result.observaciones)}
        </div>
      </div>
    </div>
  );
}
