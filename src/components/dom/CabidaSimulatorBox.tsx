'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import type { DomAnalisisRequest, DomAnalisisResponse } from '@/types/schemas';

const fieldClass =
  'mt-1 w-full rounded-lg border border-[#1E293B] bg-[#111827] px-3 py-2.5 text-sm text-[#F9FAFB] placeholder:text-[#64748B] focus:border-[#EAB308] focus:outline-none focus:ring-2 focus:ring-[#EAB308]/35';

const labelClass = 'block text-xs font-medium uppercase tracking-wide text-[#94A3B8]';

export default function CabidaSimulatorBox() {
  const t = useTranslations('dom.hub.cabida');
  const [superficieTerreno, setSuperficieTerreno] = useState(500);
  const [coeficienteConstructibilidad, setCoeficienteConstructibilidad] = useState(1);
  const [ocupacionSuelo, setOcupacionSuelo] = useState(60);
  const [destino, setDestino] = useState('Residencial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DomAnalisisResponse | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const payload: DomAnalisisRequest = {
      superficieTerreno,
      coeficienteConstructibilidad,
      ocupacionSuelo,
      destino: destino.trim() || 'Residencial',
    };
    try {
      const res = await fetch('/api/v1/dom/analisis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        factible?: boolean;
        superficieMaximaEdificable?: number;
        observaciones?: string | string[];
      };
      if (res.status === 401) {
        setError(t('errorAuth'));
        return;
      }
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : t('errorGeneric'));
        return;
      }
      if (
        typeof json.factible === 'boolean' &&
        typeof json.superficieMaximaEdificable === 'number' &&
        (typeof json.observaciones === 'string' || Array.isArray(json.observaciones))
      ) {
        setResult({
          factible: json.factible,
          superficieMaximaEdificable: json.superficieMaximaEdificable,
          observaciones: json.observaciones,
        });
      } else {
        setError(t('errorShape'));
      }
    } catch {
      setError(t('errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const obsText = result
    ? Array.isArray(result.observaciones)
      ? result.observaciones.join('\n')
      : result.observaciones
    : '';

  return (
    <BoxErrorBoundary>
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#0c1222] to-[#0A0F1E] p-6 shadow-[inset_0_1px_0_0_rgba(234,179,8,0.06)]">
        <h2 className="text-lg font-semibold tracking-tight text-[#F9FAFB]">{t('title')}</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{t('subtitle')}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cab-sup" className={labelClass}>
              {t('superficie')}
            </label>
            <input
              id="cab-sup"
              type="number"
              min={0}
              step="any"
              className={fieldClass}
              value={superficieTerreno}
              onChange={(e) => setSuperficieTerreno(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="cab-coef" className={labelClass}>
              {t('coef')}
            </label>
            <input
              id="cab-coef"
              type="number"
              min={0}
              step="any"
              className={fieldClass}
              value={coeficienteConstructibilidad}
              onChange={(e) => setCoeficienteConstructibilidad(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="cab-ocup" className={labelClass}>
              {t('ocupacion')}
            </label>
            <input
              id="cab-ocup"
              type="number"
              min={0}
              max={100}
              step="any"
              className={fieldClass}
              value={ocupacionSuelo}
              onChange={(e) => setOcupacionSuelo(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="cab-dest" className={labelClass}>
              {t('destino')}
            </label>
            <input
              id="cab-dest"
              type="text"
              className={fieldClass}
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className="mt-6 w-full rounded-lg border border-[#EAB308]/40 bg-[#EAB308]/15 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[#EAB308] transition hover:bg-[#EAB308]/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? t('running') : t('analyze')}
        </button>

        {error ? (
          <p className="mt-4 text-sm text-red-300/90" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-6 rounded-xl border border-[#EAB308]/20 bg-[#0f1629]/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#EAB308]/85">
              {t('resultLabel')}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#F9FAFB]">
              {result.factible ? t('factible') : t('notFactible')}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-300">
              {t('maxSup')}: {result.superficieMaximaEdificable} m²
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('obs')}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#94A3B8]">
              {obsText}
            </p>
          </div>
        ) : null}
      </div>
    </BoxErrorBoundary>
  );
}
