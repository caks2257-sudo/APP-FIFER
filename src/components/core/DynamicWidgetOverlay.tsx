'use client';

import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';

import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import { BankConnectionWidget } from '@/components/dashboard/widgets/BankConnectionWidget';
import { CampaignWarRoom } from '@/components/dashboard/widgets/CampaignWarRoom';
import { CashFlowWidget } from '@/components/dashboard/widgets/CashFlowWidget';
import { SmartWarRoom } from '@/components/dashboard/widgets/SmartWarRoom';
import BankConnectionWizard from '@/components/integrations/BankConnectionWizard';
import { useUIStore } from '@/store/ui-store';

function inferAppContextFromPathname(pathname: string | null): string {
  if (!pathname) return 'global';
  if (pathname.includes('/dashboard/mis-apps/')) {
    const parts = pathname.split('/').filter(Boolean);
    const i = parts.indexOf('mis-apps');
    if (i !== -1 && i < parts.length - 1) {
      return parts[i + 1] ?? 'global';
    }
  }
  return 'global';
}

export default function DynamicWidgetOverlay() {
  const pathname = usePathname();
  const activeOverlayWidgets = useUIStore((s) => s.activeOverlayWidgets);
  const overlayFinance = useUIStore((s) => s.overlayFinance);
  const overlayWarRoomConfig = useUIStore((s) => s.overlayWarRoomConfig);
  const overlayAppContext = useUIStore((s) => s.overlayAppContext);
  const setOverlayWidgets = useUIStore((s) => s.setOverlayWidgets);

  const open = activeOverlayWidgets != null && activeOverlayWidgets.length > 0;

  if (!open) return null;

  const close = () => setOverlayWidgets(null);

  const showCampaign = activeOverlayWidgets.includes('configuradorCampana');
  const hasWarRoomWidget =
    activeOverlayWidgets.includes('constructorWarRoom') ||
    activeOverlayWidgets.includes('appBlueprintWarRoom');
  const showSmartWarRoom = hasWarRoomWidget && overlayWarRoomConfig != null;
  const showFinance =
    activeOverlayWidgets.includes('BankConnectionWidget') ||
    activeOverlayWidgets.includes('CashFlowWidget');
  const showBankWizard = activeOverlayWidgets.includes('bankConnectionWizard');
  const resolvedAppContext = overlayAppContext ?? inferAppContextFromPathname(pathname);
  const panelMaxClass =
    showCampaign || showSmartWarRoom || showBankWizard ? 'max-w-5xl' : 'max-w-3xl';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Contenido enriquecido del copiloto"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar overlay"
        onClick={close}
      />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full ${panelMaxClass} flex-col gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#0A0F1E] p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <h2 className="text-sm font-semibold tracking-wide text-white/90">
            Vista detalle
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-[#EAB308]"
            onClick={close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="@container flex flex-col gap-4">
          {showSmartWarRoom && overlayWarRoomConfig ? (
            <BoxErrorBoundary>
              <SmartWarRoom
                config={overlayWarRoomConfig}
                onExecute={() => setOverlayWidgets(null)}
              />
            </BoxErrorBoundary>
          ) : null}
          {hasWarRoomWidget && !overlayWarRoomConfig ? (
            <p className="text-sm text-amber-200/80">
              Falta la configuración estructurada del War Room (warRoomConfig). El orquestador
              debe enviar el JSON validado junto con el id de widget.
            </p>
          ) : null}
          {showCampaign ? (
            <BoxErrorBoundary>
              <CampaignWarRoom />
            </BoxErrorBoundary>
          ) : null}
          {activeOverlayWidgets.includes('BankConnectionWidget') &&
          overlayFinance?.fintocAccount ? (
            <BoxErrorBoundary>
              <BankConnectionWidget account={overlayFinance.fintocAccount} />
            </BoxErrorBoundary>
          ) : null}
          {activeOverlayWidgets.includes('CashFlowWidget') &&
          overlayFinance?.cashFlowReport ? (
            <BoxErrorBoundary>
              <CashFlowWidget report={overlayFinance.cashFlowReport} />
            </BoxErrorBoundary>
          ) : null}
          {showBankWizard ? (
            <BoxErrorBoundary>
              <BankConnectionWizard appContext={resolvedAppContext} />
            </BoxErrorBoundary>
          ) : null}
          {!showSmartWarRoom &&
          !hasWarRoomWidget &&
          !showCampaign &&
          !showFinance &&
          !showBankWizard ? (
            <p className="text-sm text-white/60">
              No hay componentes visuales registrados para estos identificadores.
            </p>
          ) : null}
          {showFinance &&
          !overlayFinance?.fintocAccount &&
          !overlayFinance?.cashFlowReport && (
            <p className="text-sm text-white/55">
              No hay datos financieros cargados para mostrar estos widgets.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
