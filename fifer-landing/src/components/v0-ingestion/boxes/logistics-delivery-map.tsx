"use client";

import type { BoxProps } from "@/types/fifer-box";
import { adaptByModuleToBoxPropsData } from "@/utils/adapters";

const TRACKING_MOCK = {
  title: "Mapa de Entregas",
  activeVehicles: 28,
  delayedRoutes: 3,
  avgOnTimePct: 95,
  incidentsOpen: 1,
};

type TrackingData = {
  title?: string;
  metrics?: Record<string, string | number>;
};

export default function LogisticsDeliveryMapBox({ data, isLoading }: BoxProps) {
  const normalized = adaptByModuleToBoxPropsData("logistics", data ?? TRACKING_MOCK) as TrackingData;
  const metrics = normalized.metrics ?? {};

  return (
    <section className="w-full rounded-xl border border-[#1D4ED8]/35 bg-[#0A0F1E] p-3 text-zinc-100">
      <header className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#93C5FD]">
          {normalized.title ?? "Tracking"}
        </p>
        <span className="rounded border border-[#64748B]/50 px-2 py-0.5 text-[10px] text-[#CBD5E1]">Monitoring</span>
      </header>

      {isLoading ? (
        <p className="text-xs text-zinc-500">Cargando mapa de entregas...</p>
      ) : (
        <div className="space-y-2">
          <div className="rounded-lg border border-zinc-800/80 bg-black/30 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Zona metropolitana (placeholder)</p>
            <div className="mt-2 grid grid-cols-3 gap-1">
              <Pin colorClass="bg-emerald-500/80" />
              <Pin colorClass="bg-amber-400/80" />
              <Pin colorClass="bg-sky-500/80" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Vehiculos activos" value={metrics.activeVehicles ?? "--"} />
            <Metric label="Rutas con retraso" value={metrics.delayedRoutes ?? "--"} />
            <Metric label="On-time %" value={metrics.avgOnTimePct ?? "--"} />
            <Metric label="Incidentes" value={metrics.incidentsOpen ?? "--"} />
          </div>
        </div>
      )}
    </section>
  );
}

function Pin({ colorClass }: { colorClass: string }) {
  return <span className={`h-6 rounded-md ${colorClass}`} />;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-lg border border-zinc-800/80 bg-black/30 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-100">{String(value)}</p>
    </article>
  );
}
