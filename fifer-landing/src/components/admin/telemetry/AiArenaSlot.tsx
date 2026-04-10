"use client";

import type { TelemetryArenaGroup } from "@/lib/admin/telemetry-dashboard-data";

const EMERALD = "#059669";
const YELLOW = "#EAB308";

type Props = {
  arena: TelemetryArenaGroup[];
  className?: string;
};

/**
 * [Slot-Hero] AI Battle Arena — comparativa por especialidad (MASTER grid: usar dentro de col-span-12).
 */
export function AiArenaSlot({ arena, className = "" }: Props) {
  return (
    <section
      className={`rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E]/95 p-4 shadow-[0_0_24px_rgba(234,179,8,0.06)] backdrop-blur-sm md:p-6 ${className}`}
      data-fifer-slot="hero"
      aria-labelledby="ai-arena-title"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="ai-arena-title" className="font-fifer-heading text-lg font-bold text-zinc-100 md:text-xl">
            AI Battle Arena
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Performance ≈ inverso latencia p50; Calidad = ranking dinámico (catálogo activo).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {arena.map((group) => (
          <div
            key={group.id}
            className="rounded-[0.75rem] border border-white/10 bg-black/25 p-4"
            data-fifer-arena-group={group.id}
          >
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {group.label}
            </h3>
            <ul className="space-y-4">
              {group.engines.length === 0 ? (
                <li className="text-sm text-zinc-600">Sin motores en este bucket.</li>
              ) : (
                group.engines.map((e) => (
                  <li key={e.engineId} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">{e.name}</p>
                        <p className="text-[11px] text-zinc-500">{e.provider}</p>
                      </div>
                      <span className="tabular-nums text-[11px] text-zinc-600">
                        {e.sampleSize > 0 ? `n=${e.sampleSize}` : "—"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">{e.specialty}</p>

                    <div className="mt-2 space-y-1.5">
                      <div>
                        <div className="mb-0.5 flex justify-between text-[10px] uppercase tracking-wide text-zinc-500">
                          <span>Performance</span>
                          <span className="tabular-nums text-zinc-400">{e.performancePct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${e.performancePct}%`,
                              backgroundColor: EMERALD,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-0.5 flex justify-between text-[10px] uppercase tracking-wide text-zinc-500">
                          <span>Calidad</span>
                          <span className="tabular-nums text-zinc-400">{e.qualityPct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${e.qualityPct}%`,
                              backgroundColor: YELLOW,
                              opacity: 0.85,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
