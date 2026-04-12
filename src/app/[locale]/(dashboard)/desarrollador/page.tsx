'use client';

import type { BridgeActivePing } from '@fifer/external-bridge-engine/bridge-latency';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BaseBoxTemplate from '@/components/v0-ingestion/templates/BaseBoxTemplate';
import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import SmartInsightWidget from '@/components/core/SmartInsightWidget';
import ExternalConnectionsPanel from '@/components/system/ExternalConnectionsPanel';
import TelemetryHeaderBox from '@/components/system/TelemetryHeaderBox';
import WarRoomPanel from '@/components/system/WarRoomPanel';
import type { WarRoomEnvLogLine } from '@/components/system/WarRoomPanel';
import { useBoxData } from '@/hooks/useBoxData';
import { useExternalBridge } from '@/hooks/useExternalBridge';
import { useIsLocalhostClient } from '@/hooks/useIsLocalhostClient';
import { useUserDnaStore } from '@/store/useUserDnaStore';
import { INTERNAL_HEALTH_API_PROBES } from '@/config/internal-health-probes';
import type {
  ArchitectureHealthSnapshot,
  EngineSlotSnapshot,
  HealthEndpointSnapshot,
} from '@/types/system-health-ui';
import {
  telemetryFromEngines,
  telemetryFromExternalBridge,
  telemetryFromInternalApis,
  telemetryFromWarRoom,
} from '@/utils/developer-telemetry';
import { fetchDeveloperBoxDataForBridge } from '@/utils/fifer-box-data-bridge';

type DevTab = 'external' | 'warroom' | 'internal' | 'engines';

type HealthCardTier = 'online' | 'degraded' | 'offline';

type HealthCardKind = 'external' | 'internal' | 'engine';

function tierFromEndpoint(s: HealthEndpointSnapshot): HealthCardTier {
  if (s.credentialStatus === 'missing_key') return 'degraded';
  if (s.invalidKey || s.credentialStatus === 'invalid_key' || s.pulse === 'down')
    return 'offline';
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
    Boolean(ep?.credentialStatus === 'missing_key') ||
    (tier === 'offline' && (Boolean(ep?.invalidKey) || kind === 'external'));

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
              {ep.credentialStatus === 'missing_key'
                ? ' · falta credencial'
                : ''}
              {ep.invalidKey || ep.credentialStatus === 'invalid_key'
                ? ' · clave inválida'
                : ''}
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
          className={
            ep?.credentialStatus === 'missing_key'
              ? 'mt-3 w-full rounded-md border border-amber-400/45 bg-[#0A0F1E]/80 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-300/55 hover:bg-amber-500/10 sm:w-auto'
              : 'mt-3 w-full rounded-md border border-red-400/40 bg-[#0A0F1E]/80 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:border-red-300/60 hover:bg-red-500/15 sm:w-auto'
          }
        >
          {ep?.credentialStatus === 'missing_key' ? 'Completar credencial' : 'Actualizar Key'}
        </button>
      )}
    </div>
  );
}

const TABS: { id: DevTab; label: string; title: string; boxId: string }[] = [
  {
    id: 'external',
    label: 'APIs Externas',
    title: 'APIs Externas',
    boxId: 'fifer-dev-external',
  },
  {
    id: 'warroom',
    label: 'SALA DE GUERRA',
    title: 'Sala de Guerra',
    boxId: 'fifer-dev-war-room',
  },
  { id: 'internal', label: 'APIs Internas', title: 'APIs Internas', boxId: 'fifer-dev-internal' },
  { id: 'engines', label: 'Matriz de Motores', title: 'Matriz de Motores', boxId: 'fifer-dev-engines' },
];

function parseInternal(
  data: Record<string, unknown> | null,
): Record<string, HealthEndpointSnapshot> | null {
  if (!data || data.degraded === true) return null;
  const int = data.internal;
  if (!int || typeof int !== 'object') return null;
  return int as Record<string, HealthEndpointSnapshot>;
}

function internalPayloadComplete(int: Record<string, HealthEndpointSnapshot> | null): boolean {
  if (!int) return false;
  return INTERNAL_HEALTH_API_PROBES.every((p) => int[p.id] != null);
}

function parseEngines(data: Record<string, unknown> | null): Record<string, EngineSlotSnapshot> | null {
  if (!data || data.degraded === true) return null;
  const eng = data.engines;
  if (!eng || typeof eng !== 'object') return null;
  const byId = (eng as Record<string, unknown>).byId;
  if (!byId || typeof byId !== 'object') return null;
  return byId as Record<string, EngineSlotSnapshot>;
}

function parseWarRoom(data: Record<string, unknown> | null): {
  enginesById: Record<string, EngineSlotSnapshot>;
  bridgeLatencies: BridgeActivePing[];
  envLog: WarRoomEnvLogLine[];
  architectureHealth: ArchitectureHealthSnapshot | null;
} | null {
  if (!data || data.degraded === true) return null;
  if (data.tab !== 'war-room') return null;
  const eng = data.engines;
  if (!eng || typeof eng !== 'object') return null;
  const byId = (eng as Record<string, unknown>).byId;
  if (!byId || typeof byId !== 'object') return null;
  const bridgeLatencies = data.bridgeLatencies;
  if (!Array.isArray(bridgeLatencies)) return null;
  const envRaw = data.envManagerLog;
  const envLog = Array.isArray(envRaw) ? (envRaw as WarRoomEnvLogLine[]) : [];
  const archRaw = data.architectureHealth;
  const architectureHealth =
    archRaw && typeof archRaw === 'object'
      ? (archRaw as ArchitectureHealthSnapshot)
      : null;
  return {
    enginesById: byId as Record<string, EngineSlotSnapshot>,
    bridgeLatencies: bridgeLatencies as BridgeActivePing[],
    envLog,
    architectureHealth,
  };
}

export default function DesarrolladorPage() {
  const [activeTab, setActiveTab] = useState<DevTab>('external');
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [internalEnginesReload, setInternalEnginesReload] = useState(0);
  const [bridgeLatencies, setBridgeLatencies] = useState<BridgeActivePing[] | null>(null);
  const [warRoomFetchLoading, setWarRoomFetchLoading] = useState(false);

  const profile = useUserDnaStore((s) => s.coreProfile);
  const activeMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const isLocalhost = useIsLocalhostClient();

  const bridge = useExternalBridge();

  const fetchWarRoomBridgeLatencies = useCallback(async () => {
    setWarRoomFetchLoading(true);
    try {
      const res = await fetch('/api/v1/war-room', { cache: 'no-store' });
      const j = (await res.json().catch(() => ({}))) as {
        bridgeLatencies?: unknown;
      };
      if (res.ok && Array.isArray(j.bridgeLatencies)) {
        setBridgeLatencies(j.bridgeLatencies as BridgeActivePing[]);
      } else {
        setBridgeLatencies(null);
      }
    } catch {
      setBridgeLatencies(null);
    } finally {
      setWarRoomFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'external') void fetchWarRoomBridgeLatencies();
  }, [activeTab, fetchWarRoomBridgeLatencies]);

  const refreshExternalAll = useCallback(async () => {
    await bridge.refresh();
    await fetchWarRoomBridgeLatencies();
  }, [bridge, fetchWarRoomBridgeLatencies]);

  const fetcher = useCallback(async () => {
    if (activeTabRef.current === 'external') {
      return {
        schemaVersion: '1.0-dev-unified-connections',
        unifiedConnections: true,
      };
    }
    return fetchDeveloperBoxDataForBridge(activeMeta.boxId);
  }, [activeMeta.boxId]);

  const boxDataKey =
    activeTab === 'external' ? 'fifer-dev-external' : `${activeMeta.boxId}-${internalEnginesReload}`;

  const { data, isLoading, error } = useBoxData<Record<string, unknown>>(boxDataKey, fetcher);

  const onTelemetryRefresh = useCallback(async () => {
    if (activeTab === 'external') {
      await refreshExternalAll();
    } else {
      setInternalEnginesReload((k) => k + 1);
    }
  }, [activeTab, refreshExternalAll]);

  const telemetryRefreshing =
    activeTab === 'external' ? bridge.loading || warRoomFetchLoading : isLoading;

  const degradedPayload = data?.degraded === true;

  const externalTelemetry = useMemo(
    () =>
      telemetryFromExternalBridge(
        bridge.summary.prodCount,
        bridge.summary.mockCount,
        bridgeLatencies,
      ),
    [bridge.summary.prodCount, bridge.summary.mockCount, bridgeLatencies],
  );

  const internalTelemetry = useMemo(() => {
    const int = parseInternal(data);
    const ok = internalPayloadComplete(int);
    return telemetryFromInternalApis(ok ? int : null, degradedPayload || !ok);
  }, [data, degradedPayload]);

  const enginesTelemetry = useMemo(() => {
    const eng = parseEngines(data);
    const ok = eng && Object.keys(eng).length > 0;
    return telemetryFromEngines(ok ? eng : null, degradedPayload || !ok);
  }, [data, degradedPayload]);

  const warRoomTelemetry = useMemo(() => {
    const war = parseWarRoom(data);
    if (!war) return telemetryFromWarRoom(null, null, true);
    return telemetryFromWarRoom(war.enginesById, war.bridgeLatencies, false);
  }, [data]);

  const body = useMemo(() => {
    if (error && activeTab !== 'external') {
      return (
        <>
          {activeTab === 'internal' ? (
            <TelemetryHeaderBox
              title="APIs Internas"
              description="Sondas autenticadas hacia endpoints internos del cluster. Datos vía `/api/v1/system-health?scope=internal`."
              onRefresh={() => void onTelemetryRefresh()}
              refreshing={false}
              healthStats={telemetryFromInternalApis(null, true)}
            />
          ) : null}
          {activeTab === 'engines' ? (
            <TelemetryHeaderBox
              title="Matriz de Motores"
              description="Pulso del EngineRegistry por motor registrado. Datos vía `/api/v1/system-health?scope=engines`."
              onRefresh={() => void onTelemetryRefresh()}
              refreshing={false}
              healthStats={telemetryFromEngines(null, true)}
            />
          ) : null}
          <p className="text-sm text-red-300/90">{error.message}</p>
        </>
      );
    }
    if (data?.degraded === true && activeTab !== 'external') {
      return (
        <>
          {activeTab === 'internal' ? (
            <TelemetryHeaderBox
              title="APIs Internas"
              description="Sondas autenticadas hacia endpoints internos del cluster. Datos vía `/api/v1/system-health?scope=internal`."
              onRefresh={() => void onTelemetryRefresh()}
              refreshing={telemetryRefreshing}
              healthStats={internalTelemetry}
            />
          ) : activeTab === 'engines' ? (
            <TelemetryHeaderBox
              title="Matriz de Motores"
              description="Pulso del EngineRegistry por motor registrado. Datos vía `/api/v1/system-health?scope=engines`."
              onRefresh={() => void onTelemetryRefresh()}
              refreshing={telemetryRefreshing}
              healthStats={enginesTelemetry}
            />
          ) : null}
          <p className="text-sm text-amber-200/90">
            {String(data.errorMessage ?? 'Sonda degradada')}
          </p>
        </>
      );
    }

    if (activeTab === 'external') {
      return (
        <>
          <TelemetryHeaderBox
            title="APIs Externas"
            description="Integraciones External Bridge + auto-descubrimiento de variables de entorno. El anillo refleja el % de llaves Live frente a Mock; la latencia media proviene de sondas Bridge en `/api/v1/war-room`."
            onRefresh={() => void refreshExternalAll()}
            refreshing={telemetryRefreshing}
            healthStats={externalTelemetry}
            auxiliaryNote={
              !isLocalhost ? (
                <div
                  className="rounded-lg border border-slate-600/40 bg-[#0f1629]/90 px-4 py-3 text-xs text-slate-300"
                  role="status"
                >
                  <span className="font-semibold text-[#EAB308]">Solo monitoreo:</span> no estás en
                  localhost; la rotación de secretos está bloqueada (§14).
                </div>
              ) : (
                <p className="text-xs text-emerald-400/90">
                  Localhost: pulsa el ojo en cada llave para editar y guardar de forma segura.
                </p>
              )
            }
          />
          <ExternalConnectionsPanel
            integrations={bridge.integrations}
            loading={bridge.loading}
            error={bridge.error}
            onRefresh={refreshExternalAll}
            bridgeLatencies={bridgeLatencies}
          />
        </>
      );
    }

    if (activeTab === 'warroom') {
      const war = parseWarRoom(data);
      if (isLoading && !war) {
        return (
          <WarRoomPanel
            loading
            onRefresh={() => void onTelemetryRefresh()}
            refreshing={telemetryRefreshing}
            healthStats={warRoomTelemetry}
          />
        );
      }
      if (!war) {
        return <p className="text-sm text-slate-400">Sin datos de Sala de Guerra.</p>;
      }
      return (
        <WarRoomPanel
          enginesById={war.enginesById}
          bridgeLatencies={war.bridgeLatencies}
          envLog={war.envLog}
          architectureHealth={war.architectureHealth}
          onRefresh={() => void onTelemetryRefresh()}
          refreshing={telemetryRefreshing}
          healthStats={warRoomTelemetry}
        />
      );
    }

    if (activeTab === 'internal') {
      const int = parseInternal(data);
      if (!internalPayloadComplete(int)) {
        return (
          <>
            <TelemetryHeaderBox
              title="APIs Internas"
              description="Sondas autenticadas hacia endpoints internos del cluster. Datos vía `/api/v1/system-health?scope=internal`."
              onRefresh={() => void onTelemetryRefresh()}
              refreshing={telemetryRefreshing}
              healthStats={internalTelemetry}
            />
            <p className="text-sm text-slate-400">Sin datos de APIs internas.</p>
          </>
        );
      }
      return (
        <>
          <TelemetryHeaderBox
            title="APIs Internas"
            description="Sondas autenticadas hacia endpoints internos del cluster. Datos vía `/api/v1/system-health?scope=internal`."
            onRefresh={() => void onTelemetryRefresh()}
            refreshing={telemetryRefreshing}
            healthStats={internalTelemetry}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {INTERNAL_HEALTH_API_PROBES.map((probe) => (
              <HealthCard
                key={probe.id}
                title={probe.label}
                snapshot={int![probe.id]}
                kind="internal"
                onOpenKeyModal={() => setKeyModalOpen(true)}
              />
            ))}
          </div>
        </>
      );
    }

    const engines = parseEngines(data);
    if (!engines || Object.keys(engines).length === 0) {
      return (
        <>
          <TelemetryHeaderBox
            title="Matriz de Motores"
            description="Pulso del EngineRegistry por motor registrado. Datos vía `/api/v1/system-health?scope=engines`."
            onRefresh={() => void onTelemetryRefresh()}
            refreshing={telemetryRefreshing}
            healthStats={enginesTelemetry}
          />
          <p className="text-sm text-slate-400">Sin datos de motores.</p>
        </>
      );
    }
    return (
      <>
        <TelemetryHeaderBox
          title="Matriz de Motores"
          description="Pulso del EngineRegistry por motor registrado. Datos vía `/api/v1/system-health?scope=engines`."
          onRefresh={() => void onTelemetryRefresh()}
          refreshing={telemetryRefreshing}
          healthStats={enginesTelemetry}
        />
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
      </>
    );
  }, [
    error,
    activeTab,
    data,
    bridge.integrations,
    bridge.loading,
    bridge.error,
    bridgeLatencies,
    refreshExternalAll,
    externalTelemetry,
    internalTelemetry,
    enginesTelemetry,
    warRoomTelemetry,
    telemetryRefreshing,
    onTelemetryRefresh,
    isLocalhost,
    isLoading,
  ]);

  if (profile.role !== 'admin') {
    return (
      <div className="rounded-lg border border-red-500/40 bg-[#0A0F1E]/90 p-6 text-center text-sm text-red-200">
        Acceso Denegado
      </div>
    );
  }

  return (
    <BoxErrorBoundary>
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
          config={{ title: '', boxId: activeMeta.boxId }}
          data={
            data ??
            (activeTab !== 'external' && (isLoading || error)
              ? { schemaVersion: '1.0-dev-pending', pending: true }
              : undefined)
          }
          isLoading={activeTab === 'external' ? bridge.loading : isLoading}
        >
          {body}
        </BaseBoxTemplate>

        <SmartInsightWidget
          moduleId="desarrollador"
          boxId={activeMeta.boxId}
          contextData={{
            activeTab: activeMeta.id,
            boxId: activeMeta.boxId,
            bridge:
              activeTab === 'external'
                ? {
                    summary: bridge.summary,
                    integrationCount: bridge.integrations.length,
                  }
                : undefined,
            warRoom: activeTab === 'warroom' ? data : undefined,
            health:
              activeTab !== 'external' && activeTab !== 'warroom' ? data : undefined,
            healthError:
              activeTab === 'external' ? null : (error?.message ?? null),
            isLoading: activeTab === 'external' ? bridge.loading : isLoading,
          }}
          systemInstruction={
            'Genera insights de valor operativo para el módulo «desarrollador» (id: desarrollador). Prioriza riesgos, oportunidades y próximos pasos concretos alineados con FIFER v6.0. En «APIs Externas» usa `bridge` (External Bridge). En «SALA DE GUERRA» usa `warRoom` (latencias Bridge, motores system-health, log env-manager). En el resto usa `health` (system-health).'
          }
        />

        {keyModalOpen && activeTab !== 'external' ? (
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
                Placeholder: flujo de rotación para sondas internas / motores. Las claves de
                integraciones externas se gestionan en «APIs Externas».
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
        ) : null}
      </div>
    </BoxErrorBoundary>
  );
}
