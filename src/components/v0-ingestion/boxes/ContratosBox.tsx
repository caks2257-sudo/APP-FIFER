'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import BaseBoxTemplate from '@/components/v0-ingestion/templates/BaseBoxTemplate';
import DiscoveryBox from '@/components/core/DiscoveryBox';
import {
  contratosListPayloadSchema,
  type ContratosDataRow,
  type ContratosListPayload,
} from '@/schemas/schemas';
import {
  boxCircuitBreaker,
  notifyBoxCircuitSnapshotChange,
  subscribeBoxCircuitSnapshots,
} from '@/utils/box-circuit-breaker';
import type { V0BoxProps } from '../box-types';

const BOX_CIRCUIT_ID = 'fifer-contratos-main';

function buildDerivedInput(data: Record<string, unknown> | undefined): Record<string, unknown> {
  return {
    contratos: Array.isArray(data?.contratos) ? data!.contratos : [],
    degraded: data?.degraded,
    errorMessage: data?.errorMessage,
    errorCode: data?.errorCode,
    schemaVersion: data?.schemaVersion,
  };
}

/**
 * Box resiliente — Nevado Técnico via `BaseBoxTemplate`, tabla densa Chicureo, grid 12.
 * Circuito abierto: sin parse ni `recordFailure`; Discovery `circuit-open`.
 * Circuito cerrado: try/catch + `recordFailure('fifer-contratos-main')` en error de parse.
 */
export default function ContratosBox({
  data,
  config,
  isRefining = false,
  isLocked = false,
}: V0BoxProps) {
  const circuitOpen = useSyncExternalStore(
    subscribeBoxCircuitSnapshots,
    () => boxCircuitBreaker.isCircuitOpen(BOX_CIRCUIT_ID),
    () => false,
  );

  useEffect(() => {
    if (!circuitOpen) return;
    const id = window.setInterval(() => notifyBoxCircuitSnapshotChange(), 1000);
    return () => window.clearInterval(id);
  }, [circuitOpen]);

  /** Evita doble `recordFailure` en Strict Mode con el mismo `data` roto. */
  const recordedFailForDataKey = useRef<string | null>(null);

  const { payload, parseError } = useMemo(() => {
    if (circuitOpen) {
      return { payload: null as ContratosListPayload | null, parseError: null as string | null };
    }
    const dataKey = JSON.stringify(data ?? {});
    try {
      const derived = buildDerivedInput(data);
      const parsed = contratosListPayloadSchema.safeParse(derived);
      if (!parsed.success) {
        throw new Error(parsed.error.message);
      }
      recordedFailForDataKey.current = null;
      return { payload: parsed.data as ContratosListPayload, parseError: null as string | null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'parse';
      if (recordedFailForDataKey.current !== dataKey) {
        recordedFailForDataKey.current = dataKey;
        boxCircuitBreaker.recordFailure(BOX_CIRCUIT_ID);
      }
      return { payload: null, parseError: msg };
    }
  }, [data, circuitOpen]);

  const title = String(config?.title ?? 'Contratos Chicureo');

  const templateData = useMemo(
    () => ({ ...(data ?? {}), _contratosBox: true }),
    [data],
  );

  const rows: ContratosDataRow[] = payload?.contratos ?? [];
  const degraded = Boolean(payload?.degraded);
  const errBanner = String(payload?.errorMessage ?? '');

  if (circuitOpen) {
    return (
      <BaseBoxTemplate
        data={templateData}
        config={{ ...config, title }}
        isLoading={false}
        isRefining={false}
        isLocked={isLocked}
      >
        <div className="grid min-h-0 grid-cols-12 gap-3">
          <div className="col-span-12">
            <DiscoveryBox
              reason="circuit-open"
              className="min-h-[180px] border-[#ef4444]/35 bg-[#0A0F1E]/80"
            />
            <p className="mt-2 text-center font-mono text-[10px] text-[#94A3B8]">
              Box <span className="text-[#ef4444]">{BOX_CIRCUIT_ID}</span> — sin hidratar payload
            </p>
          </div>
        </div>
      </BaseBoxTemplate>
    );
  }

  return (
    <BaseBoxTemplate
      data={templateData}
      config={{ ...config, title }}
      isLoading={false}
      isRefining={isRefining}
      isLocked={isLocked}
    >
      <div className="grid min-h-0 grid-cols-12 gap-3">
        {parseError ? (
          <div className="col-span-12">
            <DiscoveryBox
              reason="error"
              className="min-h-[160px] rounded-[0.75rem] border-[#EAB308]/25"
            />
            <p className="mt-2 font-mono text-[10px] text-[#94A3B8]">{parseError}</p>
          </div>
        ) : null}

        {!parseError && degraded && errBanner ? (
          <div className="col-span-12 rounded-[0.75rem] border border-[#EAB308]/35 bg-[#0A0F1E]/90 px-3 py-2 text-xs text-[#EAB308]">
            {errBanner}
          </div>
        ) : null}

        {!parseError ? (
          <div className="col-span-12 overflow-x-auto rounded-[0.75rem] border border-[#EAB308]/25 bg-[#0A0F1E]/50">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#EAB308]/30 text-[10px] font-semibold uppercase tracking-wide text-[#EAB308]">
                  <th className="px-2 py-1.5">ID</th>
                  <th className="px-2 py-1.5">Local</th>
                  <th className="px-2 py-1.5">Arrendatario</th>
                  <th className="px-2 py-1.5">UF</th>
                  <th className="px-2 py-1.5">Vence</th>
                  <th className="px-2 py-1.5">Estado</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-[#F9FAFB]">
                {rows.length === 0 && !degraded ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-[#64748B]">
                      Sin filas BDUI.
                    </td>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.06] hover:bg-white/[0.04]"
                  >
                    <td className="whitespace-nowrap px-2 py-1 font-data text-[#EAB308]">{row.id}</td>
                    <td className="max-w-[140px] truncate px-2 py-1 text-[#CBD5E1]">{row.localNombre}</td>
                    <td className="max-w-[120px] truncate px-2 py-1 text-[#CBD5E1]">{row.arrendatario}</td>
                    <td className="whitespace-nowrap px-2 py-1 font-data">{row.montoUF}</td>
                    <td className="whitespace-nowrap px-2 py-1 font-data text-[#94A3B8]">{row.vencimiento}</td>
                    <td className="whitespace-nowrap px-2 py-1 font-semibold text-[#EAB308]">{row.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </BaseBoxTemplate>
  );
}
