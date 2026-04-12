'use client';

import { useTranslations } from 'next-intl';

import CabidaSimulatorBox from '@/components/dom/CabidaSimulatorBox';
import ExpedienteBuilderBox from '@/components/dom/ExpedienteBuilderBox';
import ExpedientesActivosBox from '@/components/dom/ExpedientesActivosBox';
import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import SmartInsightWidget from '@/components/core/SmartInsightWidget';
import { Link } from '@/i18n/navigation';

const spokeKeys = ['recepcion', 'permisos', 'regularizaciones', 'normativa'] as const;

export default function DomHubPage() {
  const t = useTranslations('dom.hub');
  const tSpokes = useTranslations('dom.hub.spokes');
  const tCommon = useTranslations('common');

  return (
    <BoxErrorBoundary>
      <div className="flex w-full flex-col gap-8 pb-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#F9FAFB]">{t('title')}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-[#94A3B8]">{t('subtitle')}</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {spokeKeys.map((key) => (
            <Link
              key={key}
              href={`/dom/${key}`}
              className="block min-w-0 rounded-xl border border-[#1E293B] bg-[#111827]/40 p-5 transition hover:border-[#EAB308]/40 hover:bg-[#111827]/80"
            >
              <h2 className="text-base font-semibold text-[#F9FAFB]">{tSpokes(`${key}.label`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{tSpokes(`${key}.description`)}</p>
              <span className="mt-3 inline-block text-sm font-medium text-[#EAB308]">
                {tCommon('openArrow')}
              </span>
            </Link>
          ))}
        </section>

        <section className="border-t border-[#1E293B] pt-8">
          <CabidaSimulatorBox />
        </section>

        <section className="border-t border-[#1E293B] pt-8">
          <ExpedienteBuilderBox />
        </section>

        <section className="border-t border-[#1E293B] pt-8">
          <ExpedientesActivosBox />
        </section>

        <section className="border-t border-[#1E293B] pt-8">
          <SmartInsightWidget
            moduleId="dom"
            boxId="dom-hub"
            contextData={{}}
            systemInstruction={t('insightInstruction')}
          />
        </section>
      </div>
    </BoxErrorBoundary>
  );
}
