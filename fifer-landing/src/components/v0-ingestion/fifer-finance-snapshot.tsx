import React from "react";
import { TrendingUp, DollarSign, Activity, PieChart } from "lucide-react";
import { BoxLockedOverlay } from "@/components/core/BoxLockedOverlay";
import type { BoxProps } from "@/types/fifer-box";

interface KpiData {
  label: string;
  value: number | string;
}

interface FiferBoxProps extends Pick<BoxProps, "isLocked"> {
  data?: { kpis: KpiData[] };
  isLoading?: boolean;
  error?: Error | null;
}

export function FiferFinanceSnapshot({ data, isLoading, error, isLocked }: FiferBoxProps) {
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[200px] w-full animate-pulse items-center justify-center rounded-[0.75rem] border border-[#059669]/20 bg-[#0A0F1E]">
        <span className="font-medium text-[#059669]/50">Cargando motor financiero...</span>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="relative h-full min-h-[220px] w-full overflow-hidden rounded-[0.75rem] border border-[#059669]/25 bg-[#0A0F1E] shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1E] via-[#0A0F1E] to-slate-900/80" aria-hidden />
        <BoxLockedOverlay moduleName="Finanzas · Cashflow" reason="API Key requerida o sin permisos (Gateway v2)." />
      </div>
    );
  }

  if (error || !data?.kpis) {
    return (
      <div className="flex h-full w-full flex-col justify-center rounded-[0.75rem] border border-red-500/20 bg-[#0A0F1E] p-6">
        <span className="font-bold text-red-400">Ghost Mode Activado</span>
        <p className="mt-2 text-sm text-slate-400">No se pudo hidratar el flujo de caja.</p>
      </div>
    );
  }

  const icons = [TrendingUp, DollarSign, Activity, PieChart];

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-[0.75rem] border border-[#059669]/30 bg-[#0A0F1E] p-6 shadow-lg">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#D97706]/10 blur-3xl transition-all duration-500 group-hover:bg-[#D97706]/20" />

      <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
        <Activity className="h-5 w-5 text-[#059669]" />
        Flujo de Caja Consolidado
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {data.kpis.map((kpi, index) => {
          const Icon = icons[index % icons.length];
          return (
            <div key={index} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4 text-[#D97706]" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{kpi.label}</span>
              </div>
              <span className="text-xl font-semibold text-white">
                {typeof kpi.value === "number" ? `$${kpi.value.toLocaleString("es-CL")}` : kpi.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
