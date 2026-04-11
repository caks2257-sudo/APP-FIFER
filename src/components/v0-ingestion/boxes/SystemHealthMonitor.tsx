'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import BaseBoxTemplate from '@/components/v0-ingestion/templates/BaseBoxTemplate';
import { DASHBOARD_REFERENCE_WIDGETS } from '@/config/dashboardReferenceWidgets';
import { useLayoutStore } from '@/store/useLayoutStore';
import {
  boxCircuitBreaker,
  notifyBoxCircuitSnapshotChange,
  subscribeBoxCircuitSnapshots,
} from '@/utils/box-circuit-breaker';
import { CONTRACTS_CHICUREO_API_CIRCUIT_ID } from '@/utils/contracts-chicureo-circuit';
import { validateLayoutSanity } from '@/utils/layout/commanderLayoutSanity';
import type { BoxProps } from '../registry';

/** Bioma diagnóstico rojo (#ef4444) — fallos activos en rompecircuitos. */
const CIRCUIT_OPEN_LABELS: Record<string, string> = {
  'fifer-contratos-main': 'App de Contratos (Control Chicureo)',
  'contracts-chicureo-api': 'API Contratos Chicureo (HTTP)',
};

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

function line(msg: string): string {
  return `[${ts()}] ${msg}`;
}

export default function SystemHealthMonitor({
  data,
  config,
  isRefining = false,
  isLocked = false,
}: BoxProps) {
  const slotOrder = useLayoutStore((s) => s.slotOrder);
  const healUserLayoutSolapes = useLayoutStore((s) => s.healUserLayoutSolapes);

  const [logs, setLogs] = useState<string[]>(() => [line('Kernel diagnóstico — feed terminal (Electric Yellow).')]);
  const openIdsSignature = useSyncExternalStore(
    subscribeBoxCircuitSnapshots,
    () => [...boxCircuitBreaker.listOpenCircuitIds()].sort().join('|'),
    () => '',
  );
  const openIds = openIdsSignature ? openIdsSignature.split('|') : [];
  const prevSig = useRef('');

  const push = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-100), line(msg)]);
  }, []);

  const refreshOpenCircuits = useCallback(() => {
    notifyBoxCircuitSnapshotChange();
  }, []);

  const repairedCount = useMemo(
    () =>
      validateLayoutSanity({
        widgets: DASHBOARD_REFERENCE_WIDGETS,
        slotOrder,
      }).repairedSlotsCount,
    [slotOrder],
  );

  useEffect(() => {
    refreshOpenCircuits();
  }, [slotOrder, refreshOpenCircuits]);

  useEffect(() => {
    const sig = `${[...openIds].sort().join(',')}|${repairedCount}`;
    if (sig === prevSig.current) return;
    prevSig.current = sig;
    push(
      `estado circuitos_abiertos=[${openIds.join(', ') || '—'}] slots_reparados=${repairedCount}`,
    );
  }, [openIds, repairedCount, push]);

  useEffect(() => {
    const id = window.setInterval(() => {
      notifyBoxCircuitSnapshotChange();
      const open = boxCircuitBreaker.listOpenCircuitIds();
      const n = validateLayoutSanity({
        widgets: DASHBOARD_REFERENCE_WIDGETS,
        slotOrder: useLayoutStore.getState().slotOrder,
      }).repairedSlotsCount;
      push(`heartbeat circuit_open=${open.length} validateLayoutSanity=${n}`);
    }, 8000);
    return () => window.clearInterval(id);
  }, [push]);

  const onSanacionTotal = () => {
    boxCircuitBreaker.reset('fifer-contratos-main');
    boxCircuitBreaker.reset(CONTRACTS_CHICUREO_API_CIRCUIT_ID);
    healUserLayoutSolapes(DASHBOARD_REFERENCE_WIDGETS);
    refreshOpenCircuits();
    push(
      'SANACIÓN TOTAL — §0.2: reset(fifer-contratos-main) + reset(contracts-chicureo-api) + healUserLayoutSolapes(Commander).',
    );
  };

  const templateData = useMemo(
    () => ({ ...(data ?? {}), _systemHealthMonitor: true }),
    [data],
  );

  const title = String(config?.title ?? 'System Health Monitor');

  return (
    <BaseBoxTemplate
      data={templateData}
      config={{ ...config, title }}
      isLoading={false}
      isRefining={isRefining}
      isLocked={isLocked}
    >
      <div className="space-y-3">
        <div className="space-y-3 border-b border-[#EAB308]/20 pb-3">
          <div className="flex flex-col gap-2 font-mono text-xs text-[#EAB308] sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <p>
              <span className="text-[#94A3B8]">Slots reparados (validateLayoutSanity):</span>{' '}
              <span className="font-semibold">{repairedCount}</span>
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
              Fallos activos — circuitos ABIERTOS
            </p>
            {openIds.length ? (
              <ul className="space-y-2" role="list" aria-label="Circuitos abiertos">
                {openIds.map((circuitId) => (
                  <li
                    key={circuitId}
                    role="listitem"
                    className="rounded-lg border border-[#ef4444]/45 bg-[#ef4444]/12 px-3 py-2"
                  >
                    <div className="text-sm font-semibold text-[#ef4444]">
                      {CIRCUIT_OPEN_LABELS[circuitId] ?? circuitId}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[#fecaca]/90">{circuitId}</div>
                    <div className="mt-1 text-[10px] text-[#94A3B8]">Bioma diagnóstico · aislado atómicamente</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono text-xs text-[#EAB308]">ninguno</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onSanacionTotal}
          className="w-full rounded-lg border border-[#ef4444]/45 bg-[#ef4444]/15 px-3 py-2 text-sm font-semibold text-[#fecaca] transition hover:bg-[#ef4444]/25 sm:w-auto"
        >
          Sanación Total
        </button>

        <div
          className="max-h-[240px] overflow-y-auto rounded-md border border-[#EAB308]/30 bg-[#0A0F1E] p-3 font-mono text-[11px] leading-relaxed text-[#EAB308] shadow-[inset_0_0_0_1px_rgba(234,179,8,0.12)]"
          role="log"
          aria-live="polite"
        >
          {logs.map((l, i) => (
            <div key={`${i}-${l.slice(0, 32)}`} className="whitespace-pre-wrap break-all">
              {l}
            </div>
          ))}
        </div>
      </div>
    </BaseBoxTemplate>
  );
}
