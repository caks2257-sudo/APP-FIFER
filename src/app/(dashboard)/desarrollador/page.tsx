'use client';

import { useCallback, useMemo, useState } from 'react';
import BaseBoxTemplate from '@/components/v0-ingestion/templates/BaseBoxTemplate';
import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import SmartInsightWidget from '@/components/core/SmartInsightWidget';
import { useBoxData } from '@/hooks/useBoxData';
import { useUserDnaStore } from '@/store/useUserDnaStore';
import type { EngineSlotSnapshot, HealthEndpointSnapshot } from '@/engines/system-health';
import { fetchDeveloperBoxDataForBridge } from '@/utils/fifer-box-data-bridge';

type DevTab = 'external' | 'internal' | 'engines';

type HealthCardTier = 'online' | 'degraded' | 'offline';

type HealthCardKind = 'external' | 'internal' | 'engine';

function tierFromEndpoint(s: HealthEndpointSnapshot): HealthCardTier {
  if (s.invalidKey || s.pulse === 'down') return 'offline';
  if (s.pulse === 'degraded' || s.pulse === 'unknown') return 'degraded';
  if (s.latencyMs != null && s.latencyMs > 500) return 'degraded';
  return 'online';
}

function tierFromEngine(s: EngineSlotSnapshot): HealthCardTier {
  if (s.pulse === 'down') return 'offline';
  if (s.pulse === 'degraded' || s.pulse === 'unknown') return 'degraded';
  return 'online';
}

function labelForTier(tier: HealthCardTier): string {
  if (tier === 'online') return 'Online';
  if (tier === 'degraded') return 'Degradado';
  return 'Offline';
}

function HealthCard({
  title,
  snapshot,
  kind,
  onOpenKeyModal,
}: {
  title: string;
  snapshot: HealthEndpointSnapshot | EngineSlotSnapshot;
  kind: HealthCardKind;
  onOpenKeyModal: () => void;
}) {
  const tier =
    'latencyMs' in snapshot
      ? tierFromEndpoint(snapshot as HealthEndpointSnapshot)
      : tierFromEngine(snapshot as EngineSlotSnapshot);

  const ep = 'latencyMs' in snapshot ? (snapshot as HealthEndpointSnapshot) : null;
  const latencyLabel =
    ep?.latencyMs != null && ep.latencyMs >= 0 ? `${Math.round(ep.latencyMs)} ms` : '—';

  const border =
    tier === 'online'
      ? 'border-emerald-500/40 bg-emerald-500/10'
      : tier === 'degraded'
        ? 'border-amber-500/45 bg-amber-500/10'
        : 'border-red-500/50 bg-red-500/10';

  const dot =
    tier === 'online'
      ? 'bg-emerald-400'
      : tier === 'degraded'
        ? 'bg-amber-400'
        : 'bg-red-400';

  const showKeyButton =
    tier === 'offline' &&
    (Boolean(ep?.invalidKey) || kind === 'external');

  return (
    <div
      className={`rounded-lg border px-3 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] ${border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
            <span className="font-semibold text-[#F9FAFB]">{title}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">{snapshot.note}</p>
          {ep ? (
            <p className="mt-1 font-mono text-[11px] text-[#64748B]">
              Latencia: {latencyLabel}
              {ep.httpStatus ? ` · HTTP ${ep.httpStatus}` : ''}
              {ep.invalidKey ? ' · clave inválida' : ''}
            </p>
          ) : (
            <p className="mt-1 font-mono text-[11px] text-[#64748B]">
              {(snapshot as EngineSlotSnapshot).registered
                ? (snapshot as EngineSlotSnapshot).inService
                  ? 'Registrado · en servicio'
                  : 'Registrado · fuera de servicio'
                : 'No registrado'}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span
            className={`text-xs font-bold uppercase tracking-wide ${
              tier === 'online'
                ? 'text-emerald-300'
                : tier === 'degraded'
                  ? 'text-amber-200'
                  : 'text-red-200'
            }`}
          >
            {labelForTier(tier)}
          </span>
        </div>
      </div>
      {showKeyButton && (
        <button
          type="button"
          onClick={onOpenKeyModal}
          className="mt-3 w-full rounded-md border border-red-400/40 bg-[#0A0F1E]/80 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:border-red-300/60 hover:bg-red-500/15 sm:w-auto"
        >
          Actualizar Key
        </button>
      )}
    </div>
  );
}

const TABS: { id: DevTab; label: string; title: string; boxId: string }[] = [
  { id: 'external', label: 'APIs externas', title: 'APIs externas', boxId: 'fifer-dev-external' },
  { id: 'internal', label: 'APIs internas', title: 'APIs internas', boxId: 'fifer-dev-internal' },
  { id: 'engines', label: 'Matriz de motores', title: 'Matriz de motores', boxId: 'fifer-dev-engines' },
];

function parseExternal(
  data: Record<string, unknown> | null,
): { openai?: HealthEndpointSnapshot; google?: HealthEndpointSnapshot } | null {
  if (!data || data.degraded === true) return null;
  const ext = data.external;
  if (!ext || typeof ext !== 'object') return null;
  const o = ext as Record<string, unknown>;
  return {
    openai: o.openai as HealthEndpointSnapshot | undefined,
    google: o.google as HealthEndpointSnapshot | undefined,
  };
}

function parseInternal(
  data: Record<string, unknown> | null,
): { misbots?: HealthEndpointSnapshot; contratos?: HealthEndpointSnapshot } | null {
  if (!data || data.degraded === true) return null;
  const int = data.internal;
  if (!int || typeof int !== 'object') return null;
  const o = int as Record<string, unknown>;
  return {
    misbots: o.misbots as HealthEndpointSnapshot | undefined,
    contratos: o.contratos as HealthEndpointSnapshot | undefined,
  };
}

function parseEngines(data: Record<string, unknown> | null): Record<string, EngineSlotSnapshot> | null {
  if (!data || data.degraded === true) return null;
  const eng = data.engines;
  if (!eng || typeof eng !== 'object') return null;
  const byId = (eng as Record<string, unknown>).byId;
  if (!byId || typeof byId !== 'object') return null;
  return byId as Record<string, EngineSlotSnapshot>;
}

export default function DesarrolladorPage() {
  const [activeTab, setActiveTab] = useState<DevTab>('external');
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const profile = useUserDnaStore((s) => s.coreProfile);
  const activeMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const fetcher = useCallback(
    () => fetchDeveloperBoxDataForBridge(activeMeta.boxId),
    [activeMeta.boxId],
  );

  const { data, isLoading, error } = useBoxData<Record<string, unknown>>(activeMeta.boxId, fetcher);

  const body = useMemo(() => {
    if (error) {
      return (
        <p className="text-sm text-red-300/90">
          {error.message}
        </p>
      );
    }
    if (data?.degraded === true) {
      return (
        <p className="text-sm text-amber-200/90">
          {String(data.errorMessage ?? 'Sonda degradada')}
        </p>
      );
    }

    if (activeTab === 'external') {
      const ext = parseExternal(data);
      if (!ext?.openai || !ext.google) {
        return <p className="text-sm text-slate-400">Sin datos de APIs externas.</p>;
      }
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <HealthCard
            title="OpenAI (status + clave)"
            snapshot={ext.openai}
            kind="external"
            onOpenKeyModal={() => setKeyModalOpen(true)}
          />
          <HealthCard
            title="Google Gemini (discovery + clave)"
            snapshot={ext.google}
            kind="external"
            onOpenKeyModal={() => setKeyModalOpen(true)}
          />
        </div>
      );
    }

    if (activeTab === 'internal') {
      const int = parseInternal(data);
      if (!int?.misbots || !int.contratos) {
        return <p className="text-sm text-slate-400">Sin datos de APIs internas.</p>;
      }
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <HealthCard
            title="GET /api/v1/misbots"
            snapshot={int.misbots}
            kind="internal"
            onOpenKeyModal={() => setKeyModalOpen(true)}
          />
          <HealthCard
            title="GET /api/v1/contratos"
            snapshot={int.contratos}
            kind="internal"
            onOpenKeyModal={() => setKeyModalOpen(true)}
          />
        </div>
      );
    }

    const engines = parseEngines(data);
    if (!engines || Object.keys(engines).length === 0) {
      return <p className="text-sm text-slate-400">Sin datos de motores.</p>;
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(engines).map(([id, snap]) => (
          <HealthCard
            key={id}
            title={id}
            snapshot={snap}
            kind="engine"
            onOpenKeyModal={() => setKeyModalOpen(true)}
          />
        ))}
      </div>
    );
  }, [activeTab, data, error]);

  if (profile.role !== 'admin') {
    return (
      <div className="rounded-lg border border-red-500/40 bg-[#0A0F1E]/90 p-6 text-center text-sm text-red-200">
        Acceso Denegado
      </div>
    );
  }

  return (
    <BoxErrorBoundary>
      {/* Const. v6.0 — inmunidad: el circuito registra fallos con boxCircuitBreaker.recordFailure (p. ej. useBoxData / shells de box). */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 border-b border-[#EAB308]/20 pb-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#EAB308]/20 text-[#EAB308]'
                  : 'text-slate-400 hover:bg-[#EAB308]/10 hover:text-[#EAB308]/90'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <BaseBoxTemplate
          key={activeMeta.boxId}
          config={{ title: activeMeta.title, boxId: activeMeta.boxId }}
          data={data ?? undefined}
          isLoading={isLoading}
        >
          {body}
        </BaseBoxTemplate>

        <SmartInsightWidget
          moduleId="desarrollador"
          boxId={activeMeta.boxId}
          contextData={{
            activeTab: activeMeta.id,
            boxId: activeMeta.boxId,
            health: data,
            healthError: error?.message ?? null,
            isLoading,
          }}
          systemInstruction={
            'Genera insights de valor operativo para el módulo «desarrollador» (id: desarrollador). Prioriza riesgos, oportunidades y próximos pasos concretos alineados con FIFER v6.0. Usa el objeto `health` (sondas system-health por pestaña) y `activeTab` para consejos operativos sobre latencia, claves API y motores registrados.'
          }
        />

        {keyModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dev-key-modal-title"
          >
            <div className="max-w-md rounded-xl border border-[#EAB308]/30 bg-[#0A0F1E] p-5 shadow-xl">
              <h2 id="dev-key-modal-title" className="text-base font-semibold text-[#EAB308]">
                Actualizar claves API
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Placeholder: aquí conectaremos el flujo seguro de rotación de{' '}
                <code className="text-xs text-slate-400">OPENAI_API_KEY</code> y claves Gemini.
              </p>
              <button
                type="button"
                onClick={() => setKeyModalOpen(false)}
                className="mt-4 rounded-lg border border-white/15 bg-[#1E293B] px-4 py-2 text-sm text-white hover:bg-[#334155]"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </BoxErrorBoundary>
  );
}
