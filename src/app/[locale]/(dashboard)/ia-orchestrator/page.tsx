'use client';

import { useTranslations } from 'next-intl';

import AiOrchestratorBox from '@/components/boxes/ai-orchestrator/AiOrchestratorBox';
import SmartInsightWidget from '@/components/core/SmartInsightWidget';

/**
 * Hub AODS — §25.5: ruta dedicada; box registrado como `ai-orchestrator-box` en el catálogo FIFER.
 */
export default function IaOrchestratorPage() {
  const t = useTranslations('iaOrchestrator.hub');

  return (
    <div className="flex w-full flex-col gap-8 pb-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F9FAFB]">{t('title')}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-[#94A3B8]">{t('subtitle')}</p>
      </header>

      <AiOrchestratorBox data={{}} />

      <section className="border-t border-[#1E293B] pt-8">
        <SmartInsightWidget
          moduleId="ia-orchestrator"
          boxId="ai-orchestrator-box"
          contextData={{}}
          systemInstruction={t('insightInstruction')}
        />
      </section>
    </div>
  );
}
