'use client';

import type { ReactNode } from 'react';

import type { TelemetryHealthStats } from '@/utils/developer-telemetry';

export type { TelemetryHealthStats } from '@/utils/developer-telemetry';

type Props = {
  title: string;
  description: string;
  onRefresh: () => void;
  refreshing?: boolean;
  healthStats: TelemetryHealthStats;
  /** Nota bajo el header (p. ej. aviso localhost). */
  auxiliaryNote?: ReactNode;
};

const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;

function ringColor(pct: number): string {
  if (pct >= 70) return '#34d399';
  if (pct >= 35) return '#fbbf24';
  return '#f87171';
}

function UptimeRing({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent));
  const dash = (RING_C * p) / 100;
  const gap = RING_C - dash;
  const stroke = ringColor(p);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width="72"
        height="72"
        viewBox="0 0 56 56"
        className="shrink-0"
        aria-hidden
      >
        <circle
          cx="28"
          cy="28"
          r={RING_R}
          fill="none"
          stroke="rgba(148,163,184,0.25)"
          strokeWidth="4"
        />
        <circle
          cx="28"
          cy="28"
          r={RING_R}
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform="rotate(-90 28 28)"
        />
      </svg>
      <span className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {p}%
      </span>
    </div>
  );
}

function LatencyBar({
  avgMs,
  maxMs,
}: {
  avgMs: number | null;
  maxMs: number;
}) {
  const has = avgMs != null && avgMs >= 0 && Number.isFinite(avgMs);
  const widthPct = has ? Math.min(100, (avgMs! / maxMs) * 100) : 0;
  const barColor =
    !has ? 'bg-slate-600' : avgMs! > 800 ? 'bg-red-400' : avgMs! > 400 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="min-w-[140px] max-w-[200px] flex-1">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Latencia media
      </p>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${has ? widthPct : 8}%` }}
        />
      </div>
      <p className="mt-1 font-mono text-xs text-slate-300">
        {has ? `${Math.round(avgMs!)} ms` : '—'}
      </p>
    </div>
  );
}

/**
 * Cabecera de telemetría reutilizable — Nevado Técnico (§0).
 * Izquierda: copy + acción; derecha: anillo uptime, errores, barra de latencia.
 */
export default function TelemetryHeaderBox({
  title,
  description,
  onRefresh,
  refreshing,
  healthStats,
  auxiliaryNote,
}: Props) {
  const {
    uptimePercent,
    uptimeLabel = 'Uptime',
    errorCount,
    errorLabel = 'Errores',
    avgLatencyMs,
    latencyBarMaxMs = 2000,
    liveCount,
    mockCount,
  } = healthStats;

  const showExplicitLiveMock =
    typeof liveCount === 'number' && typeof mockCount === 'number';

  return (
    <div className="mb-6 rounded-xl border border-[#EAB308]/25 bg-[#0A0F1E] p-4 shadow-[inset_0_1px_0_0_rgba(234,179,8,0.08)] md:p-5">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#EAB308]/90">
            Telemetría
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#F9FAFB] md:text-2xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="mt-4 rounded-lg border border-[#EAB308]/40 bg-[#0A0F1E] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#EAB308] transition hover:bg-[#EAB308]/10 disabled:cursor-wait disabled:opacity-60"
          >
            {refreshing ? 'Actualizando…' : 'Actualizar estado'}
          </button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-white/5 pt-4 lg:border-t-0 lg:pt-0 xl:justify-end">
          <div className="flex flex-wrap items-end gap-5">
            <div className="flex flex-col items-center gap-1">
              <UptimeRing percent={uptimePercent} />
              <span className="max-w-[88px] text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {uptimeLabel}
              </span>
            </div>
            {showExplicitLiveMock ? (
              <div className="flex min-w-0 flex-col gap-2 pb-0.5 sm:flex-row sm:items-end sm:gap-4">
                <div className="flex items-baseline gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2">
                  <span className="font-mono text-2xl font-bold tabular-nums leading-none text-emerald-200">
                    {liveCount}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-300/90">
                    LIVE
                  </span>
                </div>
                <div className="flex items-baseline gap-2 rounded-lg border border-[#EAB308]/40 bg-[#EAB308]/10 px-3 py-2">
                  <span className="font-mono text-2xl font-bold tabular-nums leading-none text-[#FDE047]">
                    {mockCount}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#EAB308]/95">
                    MOCK
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex min-w-[72px] flex-col items-center justify-end pb-1">
                <span className="font-mono text-2xl font-bold tabular-nums text-[#F9FAFB]">
                  {errorCount}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {errorLabel}
                </span>
              </div>
            )}
          </div>
          <LatencyBar avgMs={avgLatencyMs} maxMs={latencyBarMaxMs} />
        </div>
      </div>
      {auxiliaryNote ? (
        <div className="mt-4 border-t border-white/5 pt-4">{auxiliaryNote}</div>
      ) : null}
    </div>
  );
}
