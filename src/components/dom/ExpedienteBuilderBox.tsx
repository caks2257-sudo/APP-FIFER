'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';

const fieldClass =
  'mt-1 w-full rounded-lg border border-[#1E293B] bg-[#111827] px-3 py-2.5 text-sm text-[#F9FAFB] placeholder:text-[#64748B] focus:border-[#EAB308] focus:outline-none focus:ring-2 focus:ring-[#EAB308]/35';

const labelClass = 'block text-xs font-medium uppercase tracking-wide text-[#94A3B8]';

const TRAMITE_21 = 'minvu-2.1-edificacion' as const;

export default function ExpedienteBuilderBox() {
  const t = useTranslations('dom.hub.expediente');
  const [tramite, setTramite] = useState<string>(TRAMITE_21);
  const [rolAvaluo, setRolAvaluo] = useState('');
  const [nombrePropietario, setNombrePropietario] = useState('');
  const [superficieTerreno, setSuperficieTerreno] = useState('');
  const [destinoPrincipal, setDestinoPrincipal] = useState('Residencial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadJson = (obj: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    const sup = superficieTerreno.trim() === '' ? undefined : Number(superficieTerreno.replace(',', '.'));
    const payload = {
      formType: tramite,
      projectData: {
        rolAvaluo: rolAvaluo.trim() || null,
        nombrePropietario: nombrePropietario.trim() || null,
        superficieTerreno:
          sup != null && !Number.isNaN(sup) && sup > 0 ? sup : null,
        destinoPrincipal: destinoPrincipal.trim() || null,
      },
    };
    try {
      const res = await fetch('/api/v1/dom/expedientes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        draft?: unknown;
      };
      if (res.status === 401) {
        setError(t('errorAuth'));
        return;
      }
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : t('errorGeneric'));
        return;
      }
      if (json.draft == null) {
        setError(t('errorGeneric'));
        return;
      }
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      downloadJson(json.draft, `expediente-minvu-2.1-${stamp}.json`);
      window.dispatchEvent(new CustomEvent('dom-expedientes-changed'));
    } catch {
      setError(t('errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BoxErrorBoundary>
      <section className="rounded-xl border border-[#1E293B] bg-[#0A0F1E]/90 p-6 shadow-[inset_0_1px_0_0_rgba(234,179,8,0.06)]">
        <h2 className="text-lg font-semibold tracking-tight text-[#F9FAFB]">{t('title')}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#94A3B8]">{t('subtitle')}</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="dom-expediente-tramite" className={labelClass}>
              {t('tramiteLabel')}
            </label>
            <select
              id="dom-expediente-tramite"
              className={fieldClass}
              value={tramite}
              onChange={(e) => setTramite(e.target.value)}
            >
              <option value={TRAMITE_21}>{t('tramite21')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="dom-expediente-rol" className={labelClass}>
              {t('rol')}
            </label>
            <input
              id="dom-expediente-rol"
              type="text"
              className={fieldClass}
              value={rolAvaluo}
              onChange={(e) => setRolAvaluo(e.target.value)}
              placeholder="Ej. 12345-6"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="dom-expediente-prop" className={labelClass}>
              {t('propietario')}
            </label>
            <input
              id="dom-expediente-prop"
              type="text"
              className={fieldClass}
              value={nombrePropietario}
              onChange={(e) => setNombrePropietario(e.target.value)}
              placeholder=""
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="dom-expediente-sup" className={labelClass}>
              {t('superficie')}
            </label>
            <input
              id="dom-expediente-sup"
              type="text"
              inputMode="decimal"
              className={fieldClass}
              value={superficieTerreno}
              onChange={(e) => setSuperficieTerreno(e.target.value)}
              placeholder="m²"
            />
          </div>

          <div>
            <label htmlFor="dom-expediente-destino" className={labelClass}>
              {t('destino')}
            </label>
            <input
              id="dom-expediente-destino"
              type="text"
              className={fieldClass}
              value={destinoPrincipal}
              onChange={(e) => setDestinoPrincipal(e.target.value)}
              placeholder={t('destinoPlaceholder')}
            />
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-[#EAB308]/50 bg-[#EAB308]/15 px-5 py-2.5 text-sm font-semibold text-[#EAB308] transition hover:bg-[#EAB308]/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('generating') : t('generate')}
          </button>
        </div>
      </section>
    </BoxErrorBoundary>
  );
}
