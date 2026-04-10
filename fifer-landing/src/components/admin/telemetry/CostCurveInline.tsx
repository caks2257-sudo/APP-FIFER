"use client";

import type { TelemetryCostPoint } from "@/lib/admin/telemetry-dashboard-data";

const EMERALD = "#059669";
const YELLOW = "#EAB308";

type Props = {
  points: TelemetryCostPoint[];
  className?: string;
};

/** Curva último mes — SVG puro (sin Recharts). */
export function CostCurveInline({ points, className = "" }: Props) {
  if (!points.length) return null;
  const w = 720;
  const h = 140;
  const pad = 8;
  const maxApi = Math.max(...points.map((p) => p.apiUsd), 1);
  const maxCr = Math.max(...points.map((p) => p.credits), 1);

  const apiPts = points
    .map((p, i) => {
      const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
      const y = pad + (1 - p.apiUsd / maxApi) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const crPts = points
    .map((p, i) => {
      const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
      const y = pad + (1 - p.credits / maxCr) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={`rounded-[0.75rem] border border-white/10 bg-black/20 p-3 ${className}`}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Curva costos (~30d) — API USD vs créditos
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full" role="img" aria-label="Curva de costos último mes">
        <polyline fill="none" stroke={EMERALD} strokeWidth="2.5" points={apiPts} strokeLinejoin="round" />
        <polyline
          fill="none"
          stroke={YELLOW}
          strokeWidth="2"
          points={crPts}
          strokeLinejoin="round"
          opacity={0.75}
        />
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm" style={{ backgroundColor: EMERALD }} />
          Coste API (USD)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm opacity-80" style={{ backgroundColor: YELLOW }} />
          Créditos (escala)
        </span>
      </div>
    </div>
  );
}
