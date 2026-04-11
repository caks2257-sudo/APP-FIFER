'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import { SmartInsightWidget } from '@/components/core/SmartInsightWidget';
import BaseBoxTemplate from '@/components/v0-ingestion/templates/BaseBoxTemplate';
import { useUserDnaStore } from '@/store/useUserDnaStore';
import { InmobiliarioDataSchema, type InmobiliarioPropiedad } from '@/types/schemas';
import type { AppPreferences } from '@/types/user-dna';
import { boxCircuitBreaker, subscribeBoxCircuitSnapshots } from '@/utils/box-circuit-breaker';
import { fetchRealBoxDataForBridge } from '@/utils/fifer-box-data-bridge';
import type { V0BoxProps } from '../box-types';

const BOX_CIRCUIT_ID = 'fifer-inmobiliario-main' as const;

const EMPTY_INMO_PREFS: AppPreferences = {};

function PropiedadesTable({ rows }: { rows: InmobiliarioPropiedad[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#EAB308]/15 bg-[#0A0F1E]/60">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#EAB308]/20 text-xs uppercase tracking-wider text-[#94A3B8]">
            <th className="px-4 py-3 font-semibold">ID</th>
            <th className="px-4 py-3 font-semibold">Proyecto</th>
            <th className="px-4 py-3 font-semibold">Unidades</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-white/5 text-[#F9FAFB] last:border-0 hover:bg-white/[0.03]"
            >
              <td className="px-4 py-3 font-data text-[#EAB308]">{row.id}</td>
              <td className="px-4 py-3 text-[#CBD5E1]">{row.nombreProyecto}</td>
              <td className="px-4 py-3 font-data">{row.unidadesDisponibles}</td>
              <td className="px-4 py-3 font-data text-[#EAB308]">{row.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Box ADN `fifer-inmobiliario-main` — slot principal DashboardInmobiliario (variante Hero en plano UI).
 */
export default function FiferInmobiliarioMain({}: V0BoxProps) {
  const prefs = useUserDnaStore((state) => state.fractalDNA.inmobiliario ?? EMPTY_INMO_PREFS);
  const core = useUserDnaStore((state) => state.coreProfile);
  const updateAppPreferences = useUserDnaStore((state) => state.updateAppPreferences);

  const [propiedades, setPropiedades] = useState<InmobiliarioPropiedad[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [degradedMessage, setDegradedMessage] = useState('');
  const [isRefining, setIsRefining] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchGen, setFetchGen] = useState(0);

  const inmobiliarioCircuitOpen = useSyncExternalStore(
    subscribeBoxCircuitSnapshots,
    () => boxCircuitBreaker.isCircuitOpen(BOX_CIRCUIT_ID),
    () => false,
  );

  useEffect(() => {
    let alive = true;

    async function run() {
      setIsRefining(true);

      if (boxCircuitBreaker.isCircuitOpen(BOX_CIRCUIT_ID)) {
        if (!alive) return;
        setPropiedades([]);
        setDegraded(false);
        setDegradedMessage('');
        setIsLoading(false);
        setIsRefining(false);
        return;
      }

      setIsLoading(true);

      try {
        const raw = await fetchRealBoxDataForBridge('fiferInmobiliarioMain');
        const parsed = InmobiliarioDataSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error('InmobiliarioDataSchema inválido tras bridge');
        }
        if (!alive) return;
        const payload = parsed.data;
        setPropiedades(payload.propiedades);
        setDegraded(Boolean(payload.degraded));
        setDegradedMessage(String(payload.errorMessage ?? ''));
      } catch {
        if (!alive) return;
        boxCircuitBreaker.recordFailure(BOX_CIRCUIT_ID);
        setPropiedades([]);
        setDegraded(false);
        setDegradedMessage('');
      } finally {
        if (!alive) return;
        setIsLoading(false);
        setIsRefining(false);
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [fetchGen, inmobiliarioCircuitOpen]);

  const boxData = useMemo(() => {
    if (inmobiliarioCircuitOpen) {
      return { prefs, circuitOpen: true };
    }
    const o: Record<string, unknown> =
      propiedades.length > 0 || degraded
        ? { prefs, propiedades, degraded, errorMessage: degradedMessage }
        : { prefs };
    return o;
  }, [inmobiliarioCircuitOpen, propiedades, degraded, degradedMessage, prefs]);

  return (
    <div id="fifer-inmobiliario-main" className="h-full min-h-0 w-full">
      <BoxErrorBoundary>
        <BaseBoxTemplate
          config={{ title: 'DashboardInmobiliario' }}
          data={boxData}
          isLoading={isLoading}
          isRefining={isRefining}
        >
          <div className="space-y-4">
            <p className="text-base text-white">Bienvenido/a, {core.nombres}.</p>

            {inmobiliarioCircuitOpen ? (
              <p className="rounded-lg border border-red-500/35 bg-[#0A0F1E]/90 p-4 text-sm text-red-200">
                Circuito <span className="font-mono">{BOX_CIRCUIT_ID}</span> abierto: el Box queda
                aislado hasta sanación (umbral §0.25).
                <button
                  type="button"
                  className="ml-3 rounded border border-[#EAB308]/40 px-2 py-1 text-xs text-[#EAB308] hover:bg-[#EAB308]/10"
                  onClick={() => {
                    boxCircuitBreaker.reset(BOX_CIRCUIT_ID);
                    setFetchGen((g) => g + 1);
                  }}
                >
                  Reintentar
                </button>
              </p>
            ) : null}

            <p className="text-sm text-gray-400">
              Preferencias inmobiliarias:{' '}
              {prefs.alertasArriendo === true ? 'alertas de arriendo activas' : 'sin alertas aún'}
            </p>
            <button
              type="button"
              className="rounded border border-[#EAB308]/40 bg-[#EAB308]/10 px-4 py-2 text-sm font-medium text-[#EAB308] transition hover:bg-[#EAB308]/20"
              onClick={() => updateAppPreferences('inmobiliario', { alertasArriendo: true })}
            >
              Activar Alertas de Arriendo
            </button>

            {degraded && !propiedades.length ? (
              <p className="rounded-lg border border-[#EAB308]/35 bg-[#0A0F1E]/90 p-4 text-sm text-[#EAB308]">
                {degradedMessage || 'BDUI en modo degradado (bridge §0.25).'}
              </p>
            ) : null}
            {propiedades.length > 0 ? (
              <div className="space-y-4">
                <PropiedadesTable rows={propiedades} />
                <div className="pt-1">
                  <SmartInsightWidget
                    moduleId="inmobiliario"
                    boxId="fifer-inmobiliario-main"
                    contextData={propiedades}
                    systemInstruction="Analiza la disponibilidad de estas unidades inmobiliarias. Genera un Insight de Valor detectando proyectos con bajo stock e indicando si se debe pausar o acelerar la pauta publicitaria."
                  />
                </div>
              </div>
            ) : null}
          </div>
        </BaseBoxTemplate>
      </BoxErrorBoundary>
    </div>
  );
}
