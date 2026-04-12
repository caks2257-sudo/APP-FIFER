'use client';

import type { BridgeActivePing } from '@fifer/external-bridge-engine/bridge-latency';
import { Eye, EyeOff } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import ConnectionServiceIcon from '@/components/system/ConnectionServiceIcon';
import type { ExternalBridgeIntegrationClient } from '@/hooks/useExternalBridge';
import { useIsLocalhostClient } from '@/hooks/useIsLocalhostClient';
import { resolvePingForRow } from '@/utils/bridge-latency-mapping';

type Props = {
  integrations: ExternalBridgeIntegrationClient[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  /** Sondas Bridge desde `/api/v1/war-room` (misma fuente que latencia media de cabecera). */
  bridgeLatencies?: BridgeActivePing[] | null;
};

/** Macro-Pilares §14 — mismo orden que `BRIDGE_MACRO_PILLARS` en external-bridge-engine */
const CATEGORY_ORDER = [
  'INTELIGENCIA_ARTIFICIAL',
  'FINANZAS_PAGOS',
  'ECOMMERCE',
  'INFRAESTRUCTURA',
  'REDES_SOCIALES',
] as const;

const CATEGORY_LABEL: Record<(typeof CATEGORY_ORDER)[number], string> = {
  INTELIGENCIA_ARTIFICIAL: 'Inteligencia artificial',
  FINANZAS_PAGOS: 'Finanzas y pagos',
  ECOMMERCE: 'E-commerce',
  INFRAESTRUCTURA: 'Infraestructura',
  REDES_SOCIALES: 'Redes sociales',
};

/** Encabezado compacto (evita líneas enormes en UI) */
const CATEGORY_TAG: Record<(typeof CATEGORY_ORDER)[number], string> = {
  INTELIGENCIA_ARTIFICIAL: 'IA',
  FINANZAS_PAGOS: 'FINANZAS',
  ECOMMERCE: 'E-COMMERCE',
  INFRAESTRUCTURA: 'INFRA',
  REDES_SOCIALES: 'SOCIAL',
};

type ClusterItem =
  | {
      kind: 'group';
      groupKey: string;
      groupLabel?: string;
      iconKey?: string;
      rows: ExternalBridgeIntegrationClient[];
    }
  | { kind: 'single'; row: ExternalBridgeIntegrationClient };

function clusterIntegrationRows(rows: ExternalBridgeIntegrationClient[]): ClusterItem[] {
  const out: ClusterItem[] = [];
  const seenGroups = new Set<string>();
  for (const row of rows) {
    if (row.groupId) {
      const key = `${row.category}::${row.groupId}`;
      if (seenGroups.has(key)) continue;
      seenGroups.add(key);
      const members = rows
        .filter((r) => r.category === row.category && r.groupId === row.groupId)
        .sort((a, b) => a.envKey.localeCompare(b.envKey));
      out.push({
        kind: 'group',
        groupKey: key,
        groupLabel: row.groupLabel,
        iconKey: row.iconKey,
        rows: members,
      });
    } else {
      out.push({ kind: 'single', row });
    }
  }
  return out;
}

function badgeClasses(mode: 'MOCK' | 'PROD') {
  if (mode === 'PROD') {
    return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200';
  }
  return 'border-[#EAB308]/50 bg-[#EAB308]/10 text-[#EAB308]';
}

function modeLabel(mode: 'MOCK' | 'PROD'): 'Mock' | 'Live' {
  return mode === 'PROD' ? 'Live' : 'Mock';
}

function latencyTier(ping: BridgeActivePing): 'green' | 'amber' | 'red' | 'neutral' {
  if (ping.skipped) return 'neutral';
  if (!ping.ok) return 'red';
  if (ping.latencyMs < 800) return 'green';
  if (ping.latencyMs < 1500) return 'amber';
  return 'red';
}

const TIER_DOT: Record<'green' | 'amber' | 'red' | 'neutral', string> = {
  green: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.55)]',
  amber: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.45)]',
  red: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]',
  neutral: 'bg-slate-600',
};

/**
 * Pulso ms por fila — §16: Mock o sin sonda → `--- ms`; si no, semáforo por umbral.
 */
function LatencyPulse({
  row,
  pings,
}: {
  row: ExternalBridgeIntegrationClient;
  pings: BridgeActivePing[] | null | undefined;
}) {
  const ping = resolvePingForRow(row, pings);
  const hideMs = row.mode === 'MOCK' || !ping || ping.skipped;
  const tier = hideMs ? 'neutral' : latencyTier(ping);
  const label = hideMs ? '--- ms' : `${Math.round(ping.latencyMs)} ms`;
  const title = ping
    ? `${ping.label}: ${ping.note ?? ''}`.trim()
    : 'Sin sonda Bridge para esta integración';

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[10px] tabular-nums tracking-tight text-slate-400"
      title={title}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${TIER_DOT[tier]}`}
        aria-hidden
      />
      <span className="text-slate-300">{label}</span>
    </span>
  );
}

function GroupLatencyPulse({
  rows,
  pings,
}: {
  rows: ExternalBridgeIntegrationClient[];
  pings: BridgeActivePing[] | null | undefined;
}) {
  const hasProd = rows.some((r) => r.mode === 'PROD');
  const ping = rows[0] ? resolvePingForRow(rows[0], pings) : undefined;
  const hideMs = !hasProd || !ping || ping.skipped;
  const tier = hideMs ? 'neutral' : latencyTier(ping);
  const label = hideMs ? '--- ms' : `${Math.round(ping.latencyMs)} ms`;
  const title = ping
    ? `${ping.label} (caja multi-llave): ${ping.note ?? ''}`.trim()
    : 'Sin sonda Bridge para esta caja';

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-slate-400"
      title={title}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TIER_DOT[tier]}`} aria-hidden />
      <span className="text-slate-300">{label}</span>
    </span>
  );
}

type CredentialRowProps = {
  row: ExternalBridgeIntegrationClient;
  inputsLocked: boolean;
  revealed: boolean;
  onToggleReveal: () => void;
  draft: string;
  onDraftChange: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  bridgeLatencies: BridgeActivePing[] | null | undefined;
};

function ConnectionCredentialRow({
  row,
  inputsLocked,
  revealed,
  onToggleReveal,
  draft,
  onDraftChange,
  saving,
  onSave,
  bridgeLatencies,
}: CredentialRowProps) {
  const lockedField = inputsLocked || !revealed;
  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#060a14]/80 p-3 shadow-[inset_0_1px_0_0_rgba(234,179,8,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="min-w-0 shrink-0 sm:w-[42%]">
          <p className="break-all font-mono text-[10px] font-medium leading-snug tracking-wide text-[#EAB308]/85">
            {row.envKey}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-300">{row.label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClasses(row.mode)}`}
              title={
                row.mode === 'MOCK' ? 'Modo simulación (Mock-First)' : 'Clave resuelta'
              }
            >
              {modeLabel(row.mode)}
            </span>
            {row.fromDiscovery ? (
              <span className="text-[10px] text-slate-600">auto-descubierto</span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Pulso
            </span>
            <LatencyPulse row={row} pings={bridgeLatencies} />
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">
            Origen: <span className="font-mono text-slate-400">{row.source}</span>
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex gap-2">
            <input
              type={revealed ? 'text' : 'password'}
              autoComplete="off"
              disabled={lockedField}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder={
                inputsLocked
                  ? 'Bloqueado (no localhost)'
                  : revealed
                    ? 'Pega o escribe el nuevo secreto…'
                    : '••••••••'
              }
              className="min-h-[40px] w-full min-w-0 rounded-lg border border-white/10 bg-[#0A0F1E] px-3 py-2 font-mono text-sm text-[#F9FAFB] outline-none ring-[#EAB308]/25 placeholder:text-slate-600 focus:border-[#EAB308]/45 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
            />
            <button
              type="button"
              disabled={inputsLocked}
              onClick={onToggleReveal}
              aria-label={revealed ? 'Ocultar y bloquear edición' : 'Mostrar y permitir edición'}
              className="flex h-[40px] w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0f1629] text-slate-300 transition hover:border-[#EAB308]/35 hover:text-[#EAB308] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="button"
            disabled={inputsLocked || saving || !revealed}
            onClick={onSave}
            className="mt-2 w-full rounded-lg border border-[#EAB308]/35 bg-[#EAB308]/12 px-3 py-2 text-xs font-semibold text-[#EAB308] transition hover:bg-[#EAB308]/22 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Guardando…' : `Guardar ${row.envKey}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExternalConnectionsPanel({
  integrations,
  loading,
  error,
  onRefresh,
  bridgeLatencies,
}: Props) {
  const isLocalhost = useIsLocalhostClient();
  const [savingEnvKey, setSavingEnvKey] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [secretDraft, setSecretDraft] = useState<Record<string, string>>({});
  const [revealedByEnvKey, setRevealedByEnvKey] = useState<Record<string, boolean>>({});

  const sorted = useMemo(() => {
    return [...integrations].sort((a, b) => {
      const ca = CATEGORY_ORDER.indexOf(a.category);
      const cb = CATEGORY_ORDER.indexOf(b.category);
      if (ca !== cb) return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb);
      const ga = a.groupId ?? '';
      const gb = b.groupId ?? '';
      if (ga !== gb) return ga.localeCompare(gb);
      return a.label.localeCompare(b.label);
    });
  }, [integrations]);

  const byCategory = useMemo(() => {
    const map = new Map<string, ExternalBridgeIntegrationClient[]>();
    for (const c of CATEGORY_ORDER) {
      map.set(c, []);
    }
    for (const row of sorted) {
      const cat = row.category;
      const list = map.get(cat) ?? [];
      list.push(row);
      map.set(cat, list);
    }
    return map;
  }, [sorted]);

  const save = useCallback(
    async (envKey: string) => {
      if (!isLocalhost) return;
      const secret = secretDraft[envKey]?.trim();
      if (!secret) {
        setFormError('Introduce un secreto válido.');
        return;
      }
      setFormError(null);
      setSavingEnvKey(envKey);
      try {
        const res = await fetch('/api/v1/system/external-bridge/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ envKey, secret }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        setSecretDraft((d) => ({ ...d, [envKey]: '' }));
        setRevealedByEnvKey((r) => ({ ...r, [envKey]: false }));
        onRefresh();
      } catch (e) {
        setFormError(e instanceof Error ? e.message : 'Error al guardar');
      } finally {
        setSavingEnvKey(null);
      }
    },
    [onRefresh, secretDraft, isLocalhost],
  );

  const inputsLocked = !isLocalhost;

  const toggleReveal = useCallback((envKey: string) => {
    setRevealedByEnvKey((prev) => ({ ...prev, [envKey]: !prev[envKey] }));
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {error ? <p className="text-sm text-red-300/90">{error}</p> : null}
      {formError ? <p className="text-sm text-red-300/90">{formError}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando integraciones…</p>
      ) : (
        <div className="flex flex-col gap-10">
          {CATEGORY_ORDER.map((cat) => {
            const rows = byCategory.get(cat) ?? [];
            if (rows.length === 0) return null;
            const clusters = clusterIntegrationRows(rows);
            return (
              <section
                key={cat}
                className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#0c1222] to-[#0A0F1E] p-5 shadow-[inset_0_1px_0_0_rgba(234,179,8,0.06)] md:p-6"
              >
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#EAB308]/80">
                      {CATEGORY_TAG[cat]}
                    </p>
                    <h2 className="text-lg font-semibold text-[#F9FAFB]">
                      {CATEGORY_LABEL[cat]}
                    </h2>
                  </div>
                  <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-mono text-slate-500">
                    {rows.length} variable{rows.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {clusters.map((item) => {
                    if (item.kind === 'single') {
                      const row = item.row;
                      return (
                        <div
                          key={row.envKey}
                          className="flex flex-col rounded-xl border border-white/10 bg-[#080d18]/90 p-4 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.07)]"
                        >
                          <div className="mb-3 flex items-center gap-2 border-b border-white/5 pb-3">
                            <ConnectionServiceIcon name={row.iconKey ?? 'Link2'} />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              Conexión
                            </span>
                          </div>
                          <ConnectionCredentialRow
                            row={row}
                            inputsLocked={inputsLocked}
                            revealed={!!revealedByEnvKey[row.envKey]}
                            onToggleReveal={() => toggleReveal(row.envKey)}
                            draft={secretDraft[row.envKey] ?? ''}
                            onDraftChange={(v) =>
                              setSecretDraft((d) => ({ ...d, [row.envKey]: v }))
                            }
                            saving={savingEnvKey === row.envKey}
                            onSave={() => void save(row.envKey)}
                            bridgeLatencies={bridgeLatencies}
                          />
                        </div>
                      );
                    }

                    const g = item;
                    const title = g.groupLabel ?? g.rows[0]?.label ?? 'Integración';
                    return (
                      <div
                        key={g.groupKey}
                        className="flex flex-col rounded-xl border border-[#EAB308]/20 bg-[#080d18]/95 p-4 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.12)] lg:col-span-3"
                      >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#EAB308]/15 pb-4">
                          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
                            <ConnectionServiceIcon name={g.iconKey ?? 'Database'} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#EAB308]/90">
                                Multi-llave
                              </p>
                              <h3 className="mt-0.5 text-lg font-semibold text-[#F9FAFB]">{title}</h3>
                              <p className="mt-1 text-xs text-slate-400">
                                {g.rows.length} credenciales en un solo contenedor (groupId:{' '}
                                <span className="font-mono text-slate-300">
                                  {g.rows[0]?.groupId ?? '—'}
                                </span>
                                )
                              </p>
                            </div>
                          </div>
                          <GroupLatencyPulse rows={g.rows} pings={bridgeLatencies} />
                        </div>
                        <div className="flex flex-col gap-3">
                          {g.rows.map((row) => (
                            <ConnectionCredentialRow
                              key={row.envKey}
                              row={row}
                              inputsLocked={inputsLocked}
                              revealed={!!revealedByEnvKey[row.envKey]}
                              onToggleReveal={() => toggleReveal(row.envKey)}
                              draft={secretDraft[row.envKey] ?? ''}
                              onDraftChange={(v) =>
                                setSecretDraft((d) => ({ ...d, [row.envKey]: v }))
                              }
                              saving={savingEnvKey === row.envKey}
                              onSave={() => void save(row.envKey)}
                              bridgeLatencies={bridgeLatencies}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
