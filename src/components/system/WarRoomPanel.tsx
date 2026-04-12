'use client';

import { useState } from 'react';
import { BarChart3, LineChart, PieChart } from 'lucide-react';
import type { BridgeActivePing } from '@fifer/external-bridge-engine/bridge-latency';

import TelemetryHeaderBox from '@/components/system/TelemetryHeaderBox';
import type { ArchitectureHealthSnapshot, EngineSlotSnapshot } from '@/types/system-health-ui';
import type { TelemetryHealthStats } from '@/utils/developer-telemetry';

export type WarRoomEnvLogLine = {
  ts: string;
  level: 'info' | 'warn';
  message: string;
};

type Props = {
  loading?: boolean;
  enginesById?: Record<string, EngineSlotSnapshot>;
  bridgeLatencies?: BridgeActivePing[];
  envLog?: WarRoomEnvLogLine[];
  architectureHealth?: ArchitectureHealthSnapshot | null;
  onRefresh: () => void;
  refreshing?: boolean;
  healthStats: TelemetryHealthStats;
};

function tierFromEngine(s: EngineSlotSnapshot): 'online' | 'degraded' | 'offline' {
  if (s.pulse === 'down') return 'offline';
  if (s.pulse === 'degraded' || s.pulse === 'unknown') return 'degraded';
  return 'online';
}

function PulseDot({ tier }: { tier: 'online' | 'degraded' | 'offline' }) {
  const color =
    tier === 'online'
      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.45)]'
      : tier === 'degraded'
        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
        : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.45)]';
  return <span className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${color}`} aria-hidden />;
}

function LatencyBars({ pings }: { pings: BridgeActivePing[] }) {
  if (pings.length === 0) {
    return (
      <p className="text-[11px] leading-relaxed text-slate-500">
        Sin sondas LIVE: no hay claves de integración activas en el entorno (o todas están en MOCK). Cuando existan
        llaves reales (IA, Supabase, pagos, etc.), aparecerán aquí automáticamente.
      </p>
    );
  }
  const active = pings.filter((p) => !p.skipped);
  const maxMs = Math.max(1, ...active.map((p) => p.latencyMs), 800);
  return (
    <div className="flex flex-col gap-3">
      {pings.map((p, idx) => {
        const widthPct = p.skipped
          ? 4
          : Math.min(100, (p.latencyMs / maxMs) * 100);
        return (
          <div key={`${p.id}-${idx}`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#EAB308]/90">{p.label}</span>
              <span className="font-mono text-[11px] tabular-nums text-slate-300">
                {p.skipped ? '—' : `${Math.round(p.latencyMs)} ms`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#0f1629] ring-1 ring-slate-700/40">
              <div
                className={`h-full rounded-full transition-all ${
                  p.skipped
                    ? 'bg-slate-600'
                    : p.ok
                      ? 'bg-gradient-to-r from-emerald-600/90 to-[#EAB308]/80'
                      : 'bg-red-500/85'
                }`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            {p.note ? (
              <p className="mt-1 text-[10px] leading-snug text-slate-500">{p.note}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function fmtComplianceDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function WarRoomGridSkeleton() {
  const cell =
    'break-inside-avoid rounded-xl border border-white/[0.06] bg-[#0A0F1E]/90 p-4';
  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={cell}>
          <div className="mb-3 h-3 w-28 animate-pulse rounded bg-slate-700/60" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-9 animate-pulse rounded-lg bg-slate-800/50" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WarRoomPanel({
  loading,
  enginesById = {},
  bridgeLatencies = [],
  envLog = [],
  architectureHealth = null,
  onRefresh,
  refreshing,
  healthStats,
}: Props) {
  const [latencyView, setLatencyView] = useState<'bar' | 'line' | 'pie'>('bar');
  const engineEntries = Object.entries(enginesById).sort(([a], [b]) => a.localeCompare(b));

  const quadrantClass =
    'break-inside-avoid flex flex-col rounded-xl border border-slate-700/35 bg-[#0A0F1E] p-4 shadow-[inset_0_1px_0_0_rgba(234,179,8,0.05)]';

  if (loading) {
    return (
      <div className="flex flex-col">
        <TelemetryHeaderBox
          title="Sala de Guerra"
          description="Agregado en tiempo real: motores registrados (system-health), sondas Bridge, auditoría env-manager y salud arquitectónica (§17). Fuente: `GET /api/v1/war-room`."
          onRefresh={onRefresh}
          refreshing={refreshing}
          healthStats={healthStats}
        />
        <WarRoomGridSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TelemetryHeaderBox
        title="Sala de Guerra"
        description="Agregado en tiempo real: motores registrados (system-health), sondas Bridge, auditoría env-manager y salud arquitectónica (§17). Fuente: `GET /api/v1/war-room`."
        onRefresh={onRefresh}
        refreshing={refreshing}
        healthStats={healthStats}
      />

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {/* Q1 — Motores internos */}
        <section className={quadrantClass}>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#EAB308]/90">
            Motores internos
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">EngineRegistry · pulso por motor</p>
          <ul className="mt-3 max-h-[min(55vh,380px)] space-y-1.5 overflow-y-auto pr-1">
            {engineEntries.map(([id, snap]) => {
              const tier = tierFromEngine(snap);
              return (
                <li
                  key={id}
                  className="flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-[#060a14]/90 px-2.5 py-2"
                >
                  <PulseDot tier={tier} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] font-semibold leading-tight text-[#F9FAFB]">
                      {id}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500">
                      {snap.note}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Q2 — Latencias puente */}
        <section className={quadrantClass}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#EAB308]/90">
                Latencias (puentes)
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">External Bridge · ms por sonda</p>
            </div>
            <div
              className="flex shrink-0 gap-0.5 rounded-lg border border-slate-600/45 bg-[#060a14]/95 p-0.5"
              role="group"
              aria-label="Tipo de vista de latencias"
            >
              {(
                [
                  { id: 'bar' as const, icon: BarChart3, label: 'Barras' },
                  { id: 'line' as const, icon: LineChart, label: 'Líneas' },
                  { id: 'pie' as const, icon: PieChart, label: 'Torta' },
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  title={label}
                  aria-pressed={latencyView === id}
                  onClick={() => setLatencyView(id)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    latencyView === id
                      ? 'bg-[#EAB308]/15 text-[#EAB308] ring-1 ring-[#EAB308]/35'
                      : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 overflow-y-auto pr-1">
            {latencyView === 'bar' ? (
              <LatencyBars pings={bridgeLatencies} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-600/55 bg-[#060a14]/90 px-4 py-10 text-center">
                <p className="text-[12px] font-medium text-slate-400">
                  Vista {latencyView === 'line' ? 'Líneas' : 'Torta'} requiere v0
                </p>
                <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-slate-500">
                  Integración pendiente con componentes del kit v0; las barras siguen disponibles como vista por
                  defecto.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Q3 — Env-manager consola */}
        <section className={quadrantClass}>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#EAB308]/90">
            Seguridad (env-manager)
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Últimos eventos · lectura/escritura .env (dev)</p>
          <pre
            className="mt-3 max-h-[min(55vh,380px)] overflow-auto rounded-lg border border-emerald-900/40 bg-black p-3 font-mono text-[10px] leading-relaxed text-emerald-300/95"
            role="log"
          >
            {envLog.length === 0 ? (
              <span className="text-slate-600">Sin eventos aún.</span>
            ) : (
              envLog.map((e, i) => (
                <div
                  key={`${e.ts}-${i}`}
                  className="whitespace-pre-wrap border-b border-emerald-900/25 py-1 last:border-0"
                >
                  <span className="text-emerald-600/90">{e.ts}</span>{' '}
                  <span
                    className={
                      e.level === 'warn' ? 'text-amber-400' : 'text-lime-400/90'
                    }
                  >
                    [{e.level}]
                  </span>{' '}
                  <span className="text-emerald-200/95">{e.message}</span>
                </div>
              ))
            )}
          </pre>
        </section>

        {/* Q4 — Salud arquitectónica */}
        <section className="relative flex flex-col overflow-hidden break-inside-avoid rounded-xl border-2 border-[#EAB308]/35 bg-gradient-to-br from-[#0c1222] to-[#0A0F1E] p-4 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.12)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#EAB308]/10 blur-2xl" />
          <h2 className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-[#EAB308]">
            Salud arquitectónica
          </h2>
          <p className="relative mt-0.5 text-[11px] text-slate-400">§17 · constitución, GPS, compliance</p>
          {architectureHealth ? (
            <dl className="relative mt-4 space-y-3 text-sm">
              <div className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Constitución (ADN)
                </dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-[#F9FAFB]">
                  {architectureHealth.constitution.versionLabel ?? '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  X-Ray (GPS)
                </dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-[#EAB308]">
                  {architectureHealth.gps.anchorCount != null
                    ? `${architectureHealth.gps.anchorCount} anclas`
                    : '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Modo de lectura
                </dt>
                <dd className="mt-1 font-mono text-[13px] text-slate-200">
                  {architectureHealth.readMode === 'filesystem' ? 'filesystem' : 'bundle'}
                </dd>
                {architectureHealth.reason ? (
                  <p className="mt-1 text-[10px] leading-snug text-slate-500">{architectureHealth.reason}</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-[#EAB308]/25 bg-[#EAB308]/5 px-3 py-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-[#EAB308]/80">
                  Auto-Healing (compliance)
                </dt>
                <dd className="mt-1 font-mono text-[12px] text-slate-200">
                  Última actualización:{' '}
                  <span className="text-[#F9FAFB]">
                    {fmtComplianceDate(architectureHealth.autoHealing.modifiedAtIso)}
                  </span>
                </dd>
                {architectureHealth.autoHealing.exists === false ? (
                  <p className="mt-1 text-[10px] text-amber-200/80">Archivo no encontrado en disco.</p>
                ) : null}
              </div>
              <div
                className={`rounded-lg border px-3 py-2 ${
                  architectureHealth.orphanScanSkipped
                    ? 'border-slate-600/50 bg-slate-900/30'
                    : (architectureHealth.orphanedEngines?.length ?? 0) > 0
                      ? 'border-red-500/45 bg-red-950/35'
                      : 'border-emerald-500/35 bg-emerald-950/25'
                }`}
              >
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Huérfanos (src/engines vs GPS)
                </dt>
                <dd className="mt-1">
                  {architectureHealth.orphanScanSkipped ? (
                    <p className="text-[11px] text-slate-400">
                      Escaneo no disponible (bundle / sin árbol en disco).
                    </p>
                  ) : (architectureHealth.orphanedEngines?.length ?? 0) > 0 ? (
                    <>
                      <p className="text-[11px] font-semibold text-red-300">
                        Código fuera del radar: carpetas en disco sin entrada en{' '}
                        <span className="font-mono text-red-200/95">LOCATION_MAP.json</span>
                      </p>
                      <ul className="mt-2 max-h-24 list-inside list-disc overflow-y-auto font-mono text-[10px] text-red-200/90">
                        {(architectureHealth.orphanedEngines ?? []).map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-[11px] font-semibold text-emerald-300/95">100% Mapeado</p>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="relative mt-4 text-sm text-slate-500">Sin datos de arquitectura en el payload.</p>
          )}
        </section>
      </div>
    </div>
  );
}
