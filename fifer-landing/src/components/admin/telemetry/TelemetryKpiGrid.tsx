"use client";

import type { TelemetryCostPoint, TelemetryKpis } from "@/lib/admin/telemetry-dashboard-data";
import { CostCurveInline } from "@/components/admin/telemetry/CostCurveInline";

const EMERALD = "#059669";
const YELLOW = "#EAB308";

type Props = {
  kpis: TelemetryKpis;
  costCurve: TelemetryCostPoint[];
  className?: string;
};

/**
 * [Slot-Stats-Grid] KPIs + curva economía (grid 12 interno).
 */
export function TelemetryKpiGrid({ kpis, costCurve, className = "" }: Props) {
  return (
    <section
      className={`grid grid-cols-12 gap-3 ${className}`}
      data-fifer-slot="stats-grid"
      aria-label="KPIs de salud IA"
    >
      <div className="col-span-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E]/90 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Tasa de éxito global</p>
          <p className="mt-2 font-fifer-heading text-2xl font-bold tabular-nums" style={{ color: EMERALD }}>
            {kpis.globalSuccessPercent.toFixed(1)}%
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">Fuente: {kpis.dataSource}</p>
        </div>
        <div className="rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E]/90 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Latencia promedio</p>
          <p className="mt-2 font-fifer-heading text-2xl font-bold tabular-nums text-zinc-100">
            {kpis.avgLatencyMs.toLocaleString("es-CL")}{" "}
            <span className="text-sm font-normal text-zinc-500">ms</span>
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">Ventana rollup telemetría</p>
        </div>
        <div className="rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E]/90 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Margen medio (económico)
          </p>
          <p className="mt-2 font-fifer-heading text-2xl font-bold tabular-nums" style={{ color: EMERALD }}>
            {kpis.avgMarginPercent.toFixed(1)}%
          </p>
          <p className="mt-1 text-[10px] text-zinc-600">Créditos vs coste API (snapshot salud)</p>
        </div>
      </div>

      <div className="col-span-12">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EAB308]/10 pb-2">
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: YELLOW }}>
            Alertas sistema
          </span>
          <span className="text-[10px] text-zinc-600">
            Revisa integraciones inactivas en el panel inferior (04_INTEGRATIONS_HEALTH).
          </span>
        </div>
        <CostCurveInline points={costCurve} className="mt-3" />
      </div>
    </section>
  );
}
