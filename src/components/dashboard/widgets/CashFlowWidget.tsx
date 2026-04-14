"use client";

import { usePathname } from '@/i18n/navigation';
import { Lock } from 'lucide-react';

import type { CashFlowReport } from '@/components/dashboard/widgets/contracts';
import {
  ABKUPFER_CASHFLOW_REPORT,
  ABKUPFER_MOCK_DATA,
  isAbkupferWidgetContext,
} from '@/components/dashboard/widgets/abkupfer-widget-mocks';
import { useUIStore } from '@/store/ui-store';

const DEFAULT_CASHFLOW_REPORT: CashFlowReport = {
  periodLabel: "Marzo 2026",
  currency: "CLP",
  ingresosDte: {
    projectedAmount: 8500000,
    documentCount: 18,
  },
  egresosFacturas: {
    payableAmount: 3200000,
    documentCount: 9,
  },
};

type CashFlowWidgetProps = {
  report?: CashFlowReport;
  context?: string;
  viewMode?: 'global' | 'isolated';
};

function formatCurrency(value: number, currency: CashFlowReport["currency"]): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CashFlowWidget({
  report = DEFAULT_CASHFLOW_REPORT,
  context,
  viewMode = 'global',
}: CashFlowWidgetProps) {
  const pathname = usePathname();
  const isAbkupferApp =
    context === "ab-kupfer" || (context === undefined && isAbkupferWidgetContext(pathname));
  const contextKey = context || 'global';
  const isConnected = useUIStore((state) => state.connectedBanks[contextKey] === true);
  const reportResolved = isAbkupferApp ? ABKUPFER_CASHFLOW_REPORT : report;
  const neto =
    reportResolved.ingresosDte.projectedAmount - reportResolved.egresosFacturas.payableAmount;
  const maxReference = Math.max(
    reportResolved.ingresosDte.projectedAmount,
    reportResolved.egresosFacturas.payableAmount,
    1,
  );
  const ingresosWidth = `${Math.round((reportResolved.ingresosDte.projectedAmount / maxReference) * 100)}%`;
  const egresosWidth = `${Math.round((reportResolved.egresosFacturas.payableAmount / maxReference) * 100)}%`;

  return (
    <div className="relative flex h-full w-full flex-col rounded-xl border border-gray-800 bg-[#0A1128] p-5 shadow-lg">
      {viewMode === 'isolated' ? (
        <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-amber-100/90">
              Visualizando datos exclusivos de: AB Kupfer
            </span>
            <span
              aria-hidden
              className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-[#0A1128]/80 px-2 py-1 text-[11px] text-amber-200/80"
            >
              <Lock className="h-3.5 w-3.5" />
              Bloqueado
            </span>
          </div>
        </div>
      ) : null}
      <h3 className="mb-4 text-sm font-medium text-gray-200">
        Flujo de Caja ({reportResolved.periodLabel})
      </h3>
      <div className={`relative flex-1 space-y-4 ${isConnected ? '' : 'pointer-events-none blur-sm select-none'}`}>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-400">Ingresos Proyectados</span>
            <span className="font-medium text-green-400">
              +{formatCurrency(reportResolved.ingresosDte.projectedAmount, reportResolved.currency)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-800">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{ width: ingresosWidth }}
            />
          </div>
        </div>
        {isAbkupferApp ? (
          <div className="space-y-2 rounded-md border border-white/5 bg-black/20 px-3 py-2 text-left text-xs text-gray-300">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Ingresos
            </p>
            <ul className="space-y-1.5">
              {ABKUPFER_MOCK_DATA.ingresos.map((m) => (
                <li key={m.label} className="flex justify-between gap-2">
                  <span className="min-w-0">{m.label}</span>
                  <span className="shrink-0 text-green-400/90">
                    +{formatCurrency(m.amount, reportResolved.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Egresos
            </p>
            <ul className="space-y-1.5">
              {ABKUPFER_MOCK_DATA.egresos.map((m) => (
                <li key={m.label} className="flex justify-between gap-2">
                  <span className="min-w-0">{m.label}</span>
                  <span className="shrink-0 text-red-400/90">
                    −{formatCurrency(m.amount, reportResolved.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-400">Egresos (Facturas por pagar)</span>
            <span className="font-medium text-red-400">
              -{formatCurrency(reportResolved.egresosFacturas.payableAmount, reportResolved.currency)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-800">
            <div className="h-2 rounded-full bg-red-500" style={{ width: egresosWidth }} />
          </div>
        </div>
      </div>
      {!isConnected ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border border-amber-500/30 bg-[#0A1128]/92 px-4 py-3 text-center shadow-xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-100/90">
              <Lock className="h-4 w-4" />
              Conecta tus bancos para proyectar el flujo
            </p>
          </div>
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <span className="text-sm text-gray-400">Neto Estimado</span>
        <span className="text-lg font-bold text-[#FFD700]">
          {neto >= 0 ? "+" : "-"}
          {formatCurrency(Math.abs(neto), reportResolved.currency)}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-gray-500">
        Modo: {viewMode === 'isolated' ? 'Aislado (AB Kupfer)' : 'Global (todas las empresas)'}
      </p>
    </div>
  );
}
