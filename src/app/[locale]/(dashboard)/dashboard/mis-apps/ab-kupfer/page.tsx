'use client';

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

import DashboardCanvas from '@/components/dashboard/DashboardCanvas';
import { BankConnectionWidget } from '@/components/dashboard/widgets/BankConnectionWidget';
import { CashFlowWidget } from '@/components/dashboard/widgets/CashFlowWidget';
import { SocialMediaSummaryWidget } from '@/components/dashboard/widgets/SocialMediaSummaryWidget';
import { getEnabledHubAppIds, getHubSubApps } from '@/registry/app-registry';
import { useUIStore } from '@/store/ui-store';

const WIDGET_CONTEXT = 'ab-kupfer';

export default function AbKupferPage() {
  const provisioningApps = useUIStore((s) => s.provisioningApps);
  const hiddenMisAppSlugs = useUIStore((s) => s.hiddenMisAppSlugs);
  const misAppModules = useUIStore((s) => s.misAppModules);
  const building = provisioningApps['Abkupfer'] === true;
  const enabledModuleIds = misAppModules['ab-kupfer'] ?? ['finance-core', 'social-media-core'];

  const widgets = useMemo(
    () => {
      const enabledHubIds = new Set(getEnabledHubAppIds(enabledModuleIds));
      const resolved = [];
      if (enabledHubIds.has('finanzas')) {
        resolved.push(
          {
            id: 'finance-bank-connection',
            defaultLayout: { x: 0, y: 0, w: 6, h: 3 },
            children: <BankConnectionWidget context={WIDGET_CONTEXT} viewMode="isolated" />,
          },
          {
            id: 'finance-cash-flow',
            defaultLayout: { x: 6, y: 0, w: 6, h: 3 },
            children: <CashFlowWidget context={WIDGET_CONTEXT} viewMode="isolated" />,
          },
        );
      }
      if (enabledHubIds.has('redes-sociales')) {
        resolved.push({
          id: 'abkupfer-social-summary',
          defaultLayout: { x: 0, y: 3, w: 12, h: 3 },
          children: <SocialMediaSummaryWidget context={WIDGET_CONTEXT} />,
        });
      }
      return resolved;
    },
    [enabledModuleIds],
  );
  const financeSubApps = getHubSubApps('finanzas');
  const financeBlueprintTag = financeSubApps[0]?.blueprintTestField ?? 'n/a';

  if (hiddenMisAppSlugs['ab-kupfer'] === true) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="max-w-md text-[#94A3B8]">
          Esta sub-app fue eliminada del entorno local. Vuelve a crearla desde el copiloto / Master
          App Factory si necesitas otra prueba.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex w-full min-h-[calc(100vh-4rem)] flex-col gap-6 pb-10">
      {building ? (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0A0F1E]/95 px-6 text-center backdrop-blur-md"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-14 w-14 shrink-0 animate-spin text-[#EAB308]" aria-hidden />
          <p className="mt-8 max-w-lg text-lg font-medium leading-relaxed text-[#F9FAFB]">
            🏗️ Configurando ecosistema ABKUPFER... Sincronizando catálogo de pisos y preparando
            tableros financieros.
          </p>
        </div>
      ) : null}

      <header className="min-w-0 max-w-3xl">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#F9FAFB]">
          AB Kupfer
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">
          Tablero operativo: bancos, flujo de caja y redes para el laboratorio de pisos y
          revestimientos.
        </p>
        <p className="mt-2 text-xs text-[#EAB308]/80">Blueprint Sync Tag: {financeBlueprintTag}</p>
      </header>
      <div className={building ? "pointer-events-none select-none opacity-40" : undefined}>
        <DashboardCanvas className="w-full" initialLayout={null} widgets={widgets} />
      </div>
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {financeSubApps.map((sub) => (
          <article key={sub.id} className="rounded-xl border border-[#EAB308]/20 bg-[#0A1128] p-4">
            <p className="text-[11px] font-semibold text-[#EAB308]">Finanzas heredadas</p>
            <p className="mt-1 text-sm text-[#F9FAFB]">{sub.label}</p>
            <p className="mt-1 text-xs text-[#94A3B8]">{sub.href}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
