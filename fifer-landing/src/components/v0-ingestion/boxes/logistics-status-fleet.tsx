"use client";

import type { BoxProps } from "@/types/fifer-box";
import { adaptByModuleToBoxPropsData } from "@/utils/adapters";

const LOGISTICS_MOCK_PAYLOAD = {
  title: "Estado de Flota",
  activeVehicles: 42,
  delayedRoutes: 5,
  avgOnTimePct: 93,
  incidentsOpen: 2,
};

type FleetData = {
  title?: string;
  metrics?: Record<string, string | number>;
};

export default function LogisticsStatusFleetBox({ data, isLoading }: BoxProps) {
  const normalized = adaptByModuleToBoxPropsData("logistics", data ?? LOGISTICS_MOCK_PAYLOAD) as FleetData;
  const metrics = normalized.metrics ?? {};

  return (
    <section className="w-full rounded-xl border border-[#1D4ED8]/35 bg-[#0A0F1E] p-3 text-zinc-100">
      <header className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#93C5FD]">
          {normalized.title ?? "Logistics"}
        </p>
        <span className="rounded border border-[#64748B]/50 px-2 py-0.5 text-[10px] text-[#CBD5E1]">Fleet</span>
      </header>

      {isLoading ? (
        <p className="text-xs text-zinc-500">Cargando estado de flota...</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <MetricCard label="Vehiculos activos" value={metrics.activeVehicles ?? "--"} />
          <MetricCard label="Rutas con retraso" value={metrics.delayedRoutes ?? "--"} />
          <MetricCard label="On-time %" value={metrics.avgOnTimePct ?? "--"} />
          <MetricCard label="Incidentes abiertos" value={metrics.incidentsOpen ?? "--"} />
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-lg border border-zinc-800/80 bg-black/30 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-100">{String(value)}</p>
    </article>
  );
}
