'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm, type Resolver } from 'react-hook-form';

import {
  domAnalisisRequestSchema,
  type DomAnalisisRequest,
} from '@/types/schemas';

const fieldClass =
  'mt-1 w-full rounded-lg border border-[#1E293B] bg-[#111827] px-3 py-2.5 text-sm text-[#F9FAFB] placeholder:text-[#64748B] focus:border-[#EAB308] focus:outline-none focus:ring-2 focus:ring-[#EAB308]/35';

const labelClass = 'block text-xs font-medium uppercase tracking-wide text-[#94A3B8]';

type Props = {
  onSubmit: (data: DomAnalisisRequest) => Promise<void>;
  loading: boolean;
};

export default function AnalisisTerrenoForm({ onSubmit, loading }: Props) {
  const t = useTranslations('dom.normativa.form');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DomAnalisisRequest>({
    resolver: zodResolver(
      domAnalisisRequestSchema,
    ) as Resolver<DomAnalisisRequest>,
    defaultValues: {
      superficieTerreno: 500,
      coeficienteConstructibilidad: 1,
      ocupacionSuelo: 60,
      destino: 'Residencial',
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl border border-[#1E293B] bg-[#0A0F1E] p-6"
      noValidate
    >
      <h2 className="text-lg font-semibold text-[#F9FAFB]">{t('title')}</h2>
      <p className="mt-1 text-sm text-[#94A3B8]">{t('subtitle')}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="dom-sup" className={labelClass}>
            {t('superficie')}
          </label>
          <input
            id="dom-sup"
            type="number"
            step="any"
            min={0}
            className={fieldClass}
            {...register('superficieTerreno', { valueAsNumber: true })}
          />
          {errors.superficieTerreno && (
            <p className="mt-1 text-xs text-[#EAB308]" role="alert">
              {String(errors.superficieTerreno.message)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="dom-coef" className={labelClass}>
            {t('coef')}
          </label>
          <input
            id="dom-coef"
            type="number"
            step="any"
            min={0}
            className={fieldClass}
            {...register('coeficienteConstructibilidad', { valueAsNumber: true })}
          />
          {errors.coeficienteConstructibilidad && (
            <p className="mt-1 text-xs text-[#EAB308]" role="alert">
              {String(errors.coeficienteConstructibilidad.message)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="dom-ocup" className={labelClass}>
            {t('ocupacion')}
          </label>
          <input
            id="dom-ocup"
            type="number"
            step="any"
            min={0}
            max={100}
            className={fieldClass}
            {...register('ocupacionSuelo', { valueAsNumber: true })}
          />
          {errors.ocupacionSuelo && (
            <p className="mt-1 text-xs text-[#EAB308]" role="alert">
              {String(errors.ocupacionSuelo.message)}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="dom-dest" className={labelClass}>
            {t('destino')}
          </label>
          <input
            id="dom-dest"
            type="text"
            className={fieldClass}
            placeholder={t('destinoPlaceholder')}
            {...register('destino')}
          />
          {errors.destino && (
            <p className="mt-1 text-xs text-[#EAB308]" role="alert">
              {String(errors.destino.message)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-[#1E293B] pt-6">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#EAB308] px-5 py-2.5 text-sm font-semibold text-[#0A0F1E] shadow-sm transition hover:bg-[#EAB308]/90 focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 focus:ring-offset-[#0A0F1E] disabled:opacity-60"
        >
          {loading ? t('submitRunning') : t('submit')}
        </button>
      </div>
    </form>
  );
}
