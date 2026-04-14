"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { usePathname } from "@/i18n/navigation";

import type { FintocAccount } from "@/components/dashboard/widgets/contracts";
import {
  ABKUPFER_MOCK_ACCOUNT,
  ABKUPFER_MOCK_DATA,
  isAbkupferWidgetContext,
} from "@/components/dashboard/widgets/abkupfer-widget-mocks";
import { useUIStore } from "@/store/ui-store";

const DEFAULT_FINTOC_ACCOUNT: FintocAccount = {
  id: "acc_2f7e9d15",
  name: "Cuenta Corriente Empresa",
  number: "00004092",
  currency: "CLP",
  officialName: "Santander Empresas",
  institution: {
    id: "santander_cl",
    name: "Banco Santander",
    iconInitial: "S",
  },
  balance: {
    current: 14500900,
    available: 14250900,
  },
  lastSyncAt: "Hace 3 min",
  syncStatus: "SYNCED",
};

type BankConnectionWidgetProps = {
  account?: FintocAccount;
  /** When `ab-kupfer`, muestra datos demo de la sub-app (pisos / madera). */
  context?: string;
  viewMode?: 'global' | 'isolated';
};

function formatCurrency(value: number, currency: FintocAccount["currency"]): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function BankConnectionWidget({
  account = DEFAULT_FINTOC_ACCOUNT,
  context,
  viewMode = 'global',
}: BankConnectionWidgetProps) {
  const pathname = usePathname();
  const t = useTranslations("Finance");
  const isAbkupferApp =
    context === "ab-kupfer" || (context === undefined && isAbkupferWidgetContext(pathname));
  const contextKey = context || "global";
  const isConnected = useUIStore((state) => state.connectedBanks[contextKey] === true);

  if (!isConnected) {
    return (
      <div className="flex h-full w-full flex-col justify-between rounded-xl border border-gray-800 bg-[#0A1128] p-5 shadow-lg">
        <div>
          <h3 className="text-sm font-medium text-gray-200">Conexión bancaria / SII</h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            Estado: Desconectado. Vincula bancos y documentos tributarios para habilitar saldos y
            movimientos operativos.
          </p>
        </div>
        <div className="mt-6 flex flex-col items-stretch gap-3 border-t border-gray-800 pt-4">
          <button
            type="button"
            onClick={() =>
              useUIStore.getState().setOverlayWidgets(["bankConnectionWizard"], null, null, contextKey)
            }
            className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-[#EAB308] px-5 py-2.5 text-sm font-semibold text-[#0A0F1E] shadow-sm transition hover:bg-[#EAB308]/90 focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:ring-offset-2 focus:ring-offset-[#0A1128]"
          >
            {t("syncBanksSii")}
          </button>
          <p className="text-center text-[11px] text-gray-600">Demo local: sin llamadas a API.</p>
        </div>
      </div>
    );
  }

  const accountResolved = isAbkupferApp ? ABKUPFER_MOCK_ACCOUNT : account;
  const maskedAccountNumber = `•••• ${accountResolved.number.slice(-4)}`;
  const isSynced = accountResolved.syncStatus === "SYNCED";

  return (
    <div className="flex h-full w-full flex-col justify-between rounded-xl border border-gray-800 bg-[#0A1128] p-5 shadow-lg">
      {viewMode === "isolated" ? (
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/30 text-red-500">
            <span className="font-bold">{accountResolved.institution.iconInitial}</span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-200">{accountResolved.institution.name}</h3>
            <p className="text-xs text-gray-500">
              {accountResolved.name} {maskedAccountNumber}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isSynced ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-300"}`}
        >
          {isSynced ? "Sincronizado" : "Pendiente"}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-400">Saldo Disponible</p>
        <p className="text-3xl font-bold text-white">
          {formatCurrency(accountResolved.balance.available, accountResolved.currency)}{" "}
          <span className="text-sm font-normal text-gray-500">{accountResolved.currency}</span>
        </p>
      </div>
      {isAbkupferApp ? (
        <div className="mt-4 space-y-2 border-t border-gray-800 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Movimientos recientes (demo pisos)
          </p>
          <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs text-gray-300">
            {ABKUPFER_MOCK_DATA.ingresos.map((m) => (
              <li key={m.label} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-green-400/90">{m.label}</span>
                <span className="shrink-0 font-medium text-green-400">
                  +{formatCurrency(m.amount, accountResolved.currency)}
                </span>
              </li>
            ))}
            {ABKUPFER_MOCK_DATA.egresos.map((m) => (
              <li key={m.label} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-red-400/80">{m.label}</span>
                <span className="shrink-0 font-medium text-red-400">
                  −{formatCurrency(m.amount, accountResolved.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-3 text-xs text-gray-500">
        <span>
          {viewMode === "isolated" ? "Empresa: AB Kupfer (bloqueada)" : "Empresa: Todas"} ·
          Última act: {accountResolved.lastSyncAt}
        </span>
        <button className="text-[#FFD700] hover:underline">Ver cartola &rarr;</button>
      </div>
    </div>
  );
}
