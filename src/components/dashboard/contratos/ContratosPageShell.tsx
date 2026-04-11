'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import BaseBoxTemplate from '@/components/v0-ingestion/templates/BaseBoxTemplate';
import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import { SmartInsightWidget } from '@/components/core/SmartInsightWidget';
import BoxLoader from '@/components/core/BoxLoader';
import {
  contratosListPayloadSchema,
  type ContratosDataRow,
} from '@/schemas/schemas';
import {
  isContractsCircuitOpen,
  recordFailure,
  recordSuccess,
} from '@/utils/contracts-chicureo-circuit';
import { boxCircuitBreaker, subscribeBoxCircuitSnapshots } from '@/utils/box-circuit-breaker';
import {
  buildDegradedNormalized,
  fiferContratosMainFetchUrl,
  routeContratosApiWithValidation,
} from '@/utils/fifer-box-data-bridge';

function ContractsTable({ rows }: { rows: ContratosDataRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#EAB308]/15 bg-[#0A0F1E]/60">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#EAB308]/20 text-xs uppercase tracking-wider text-[#94A3B8]">
            <th className="px-4 py-3 font-semibold">ID</th>
            <th className="px-4 py-3 font-semibold">Local (Chicureo)</th>
            <th className="px-4 py-3 font-semibold">Arrendatario</th>
            <th className="px-4 py-3 font-semibold">UF</th>
            <th className="px-4 py-3 font-semibold">Vencimiento</th>
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
              <td className="px-4 py-3 text-[#CBD5E1]">{row.localNombre}</td>
              <td className="px-4 py-3 text-[#CBD5E1]">{row.arrendatario}</td>
              <td className="px-4 py-3 font-data">{row.montoUF} UF</td>
              <td className="px-4 py-3 font-data text-[#94A3B8]">{row.vencimiento}</td>
              <td className="px-4 py-3 font-data text-[#EAB308]">{row.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ContratosPageShell() {
  const [rows, setRows] = useState<ContratosDataRow[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [degradedMessage, setDegradedMessage] = useState('');
  const [isRefining, setIsRefining] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [fetchGen, setFetchGen] = useState(0);

  const fiferContratosBoxCircuitOpen = useSyncExternalStore(
    subscribeBoxCircuitSnapshots,
    () => boxCircuitBreaker.isCircuitOpen('fifer-contratos-main'),
    () => false,
  );

  useEffect(() => {
    let alive = true;

    async function run() {
      setIsRefining(true);

      if (isContractsCircuitOpen()) {
        if (!alive) return;
        setHasError(true);
        setRows([]);
        setDegraded(false);
        setDegradedMessage('');
        setIsLoading(false);
        setIsRefining(false);
        return;
      }

      if (boxCircuitBreaker.isCircuitOpen('fifer-contratos-main')) {
        if (!alive) return;
        setHasError(true);
        setRows([]);
        setDegraded(false);
        setDegradedMessage('');
        setIsLoading(false);
        setIsRefining(false);
        return;
      }

      setIsLoading(true);
      setHasError(false);

      try {
        const res = await fetch(fiferContratosMainFetchUrl(), { method: 'GET', cache: 'no-store' });
        const json: unknown = await res.json().catch(() => null);

        let normalized: Record<string, unknown>;
        if (!res.ok) {
          normalized = buildDegradedNormalized(
            `API contratos HTTP ${res.status}`,
            'HTTP_ERROR',
          );
        } else {
          normalized = routeContratosApiWithValidation(json ?? {});
        }

        let parsed = contratosListPayloadSchema.safeParse(normalized);
        if (!parsed.success) {
          normalized = buildDegradedNormalized('Lista BDUI no válida', 'ZOD_LIST');
          parsed = contratosListPayloadSchema.safeParse(normalized);
        }

        if (!parsed.success || !alive) return;

        const payload = parsed.data;
        setRows(payload.contratos);
        setDegraded(Boolean(payload.degraded));
        setDegradedMessage(String(payload.errorMessage ?? ''));

        if (payload.degraded) {
          recordFailure();
        } else {
          recordSuccess();
        }
      } catch {
        if (!alive) return;
        boxCircuitBreaker.recordFailure('fifer-contratos-main');
        recordFailure();
        setHasError(true);
        setRows([]);
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
  }, [fetchGen, fiferContratosBoxCircuitOpen]);

  const boxData = useMemo(() => {
    const o: Record<string, unknown> =
      rows.length > 0 || degraded
        ? { contratos: rows, degraded, errorMessage: degradedMessage }
        : {};
    return o;
  }, [rows, degraded, degradedMessage]);

  return (
    <div className="grid min-h-0 grid-cols-12 gap-6 bg-[#0A0F1E]">
      <div className="col-span-12">
        <BoxErrorBoundary>
          <BoxLoader module="contracts" isLoading={isLoading} hasError={hasError} isLocked={false}>
            <BaseBoxTemplate
              data={boxData}
              config={{ title: 'Control de Contratos — Chicureo (fifer-contratos-main)' }}
              isLoading={isLoading}
              isRefining={isRefining}
              isLocked={false}
            >
              {degraded && !rows.length ? (
                <p className="rounded-lg border border-[#EAB308]/35 bg-[#0A0F1E]/90 p-4 text-sm text-[#EAB308]">
                  {degradedMessage || 'BDUI en modo degradado (bridge §0.25).'}
                </p>
              ) : null}
              {rows.length > 0 ? (
                <div className="space-y-4">
                  <ContractsTable rows={rows} />
                  <div className="pt-1">
                    <SmartInsightWidget
                      moduleId="finance"
                      boxId="fifer-contratos-main"
                      contextData={rows}
                      systemInstruction="Analiza estos contratos de arriendo en Chicureo. Detecta vencimientos críticos (menos de 60 días) y evalúa el riesgo financiero en UF. Genera un Insight de Valor breve y directo recomendando una acción."
                    />
                  </div>
                </div>
              ) : null}
            </BaseBoxTemplate>
          </BoxLoader>
        </BoxErrorBoundary>
      </div>

      <div className="col-span-12 flex flex-wrap gap-2 rounded-[0.75rem] border border-[#EAB308]/20 bg-[#1E293B]/40 px-4 py-3">
        <span className="w-full text-xs font-semibold uppercase tracking-wider text-[#EAB308]">
          Dev — resiliencia (§0.25)
        </span>
        <button
          type="button"
          onClick={() => {
            setHasError(false);
            setIsLoading((v) => !v);
          }}
          className="rounded-lg border border-[#EAB308]/30 px-3 py-1.5 text-xs font-medium text-[#F9FAFB] transition hover:bg-[#EAB308]/10"
        >
          Toggle loading (UI)
        </button>
        <button
          type="button"
          onClick={() => {
            setIsLoading(false);
            setHasError((v) => !v);
          }}
          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-[#F9FAFB] transition hover:bg-red-500/10"
        >
          Toggle error (UI)
        </button>
        <button
          type="button"
          onClick={() => {
            recordSuccess();
            setFetchGen((g) => g + 1);
          }}
          className="rounded-lg border border-[#EAB308]/30 px-3 py-1.5 text-xs font-medium text-[#F9FAFB] transition hover:bg-[#EAB308]/10"
        >
          Reintentar + cerrar circuito
        </button>
        <a
          href="/api/v1/contracts/chicureo?fail=1"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-orange-500/40 px-3 py-1.5 text-xs font-medium text-[#F9FAFB] transition hover:bg-orange-500/10"
        >
          Probar 500 (nueva pestaña)
        </a>
      </div>
    </div>
  );
}
