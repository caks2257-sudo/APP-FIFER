"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, TrendingUp } from "lucide-react";
import type { AiHealthSnapshot } from "@/lib/admin/ai-health-snapshot";
import {
  effectiveTaskScore,
  loadRankingOverrides,
  saveRankingOverrides,
  upsertAdjustment,
  type RankingOverridesPayload,
} from "@/lib/admin/ranking-overrides-storage";
import type { IAiEngine } from "@/lib/ai/ai-engine-types";
import { getEngineById } from "@/lib/ai/engine-manifest";
import { AiSyncStatusStrip, type AiSyncUiStatus } from "@/components/admin/AiSyncStatusStrip";

const EMERALD = "#059669";
const DEEP_NAVY = "#0A0F1E";

function fmtUsd(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 100 ? 0 : 2,
  }).format(n);
}

function fmtCredits(n: number) {
  return new Intl.NumberFormat("es-CL").format(Math.round(n));
}

type Props = {
  initialSnapshot: AiHealthSnapshot;
  initialEngines: IAiEngine[];
};

export function AiHealthAdminDashboard({ initialSnapshot, initialEngines }: Props) {
  const [snapshot] = useState(initialSnapshot);
  const [enginesList, setEnginesList] = useState<IAiEngine[]>(() => initialEngines);
  const [overrides, setOverrides] = useState<RankingOverridesPayload>({ adjustments: [] });
  const [rankingOpen, setRankingOpen] = useState(false);
  const [engineId, setEngineId] = useState("");
  const [taskKey, setTaskKey] = useState("");
  const [delta, setDelta] = useState("0.2");
  const [toast, setToast] = useState<string | null>(null);
  const [syncSecret, setSyncSecret] = useState("");
  const [syncStatus, setSyncStatus] = useState<AiSyncUiStatus>("idle");
  const [syncMsg, setSyncMsg] = useState<string | undefined>();

  useEffect(() => {
    setOverrides(loadRankingOverrides());
  }, []);

  useEffect(() => {
    if (!engineId && enginesList[0]) setEngineId(enginesList[0].id);
  }, [engineId, enginesList]);

  const selectedEngine = engineId
    ? enginesList.find((e) => e.id === engineId) ?? getEngineById(engineId)
    : undefined;
  const taskKeys = useMemo(
    () => (selectedEngine ? Object.keys(selectedEngine.ranking.taskSpecific) : []),
    [selectedEngine]
  );

  useEffect(() => {
    if (taskKeys.length && !taskKeys.includes(taskKey)) {
      setTaskKey(taskKeys[0]);
    }
  }, [taskKey, taskKeys]);

  const applyRankingUpdate = useCallback(() => {
    const d = Number(delta);
    if (!selectedEngine || !taskKey.trim() || !Number.isFinite(d)) {
      setToast("Completa motor, clave de tarea y delta numérico.");
      return;
    }
    const base = selectedEngine.ranking.taskSpecific[taskKey];
    if (base === undefined) {
      setToast("Clave no existe en el manifiesto de ese motor.");
      return;
    }
    const next = upsertAdjustment(overrides, {
      engineId: selectedEngine.id,
      taskKey,
      delta: d,
    });
    saveRankingOverrides(next);
    setOverrides(next);
    setToast("Rankings locales actualizados (vista previa + localStorage).");
    setRankingOpen(false);
    setTimeout(() => setToast(null), 4200);
  }, [delta, overrides, selectedEngine, taskKey]);

  const runMetaSync = useCallback(async () => {
    setSyncStatus("syncing");
    setSyncMsg(undefined);
    try {
      const res = await fetch("/api/ai/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: syncSecret.trim() || undefined }),
      });
      const j = (await res.json()) as {
        error?: string;
        discovered?: string[];
        openRouterUpserts?: number;
        openAiUpserts?: number;
        googleUpserts?: number;
      };
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setSyncMsg(
        `${j.discovered?.length ?? 0} descubiertos · OR ${j.openRouterUpserts ?? 0} · OAI ${j.openAiUpserts ?? 0} · Google ${j.googleUpserts ?? 0}`
      );
      const cat = await fetch("/api/ai/catalog?refresh=1");
      const cj = (await cat.json()) as { engines?: IAiEngine[] };
      if (Array.isArray(cj.engines) && cj.engines.length) {
        setEnginesList(cj.engines);
      }
      setSyncStatus("done");
    } catch (e) {
      setSyncStatus("error");
      setSyncMsg(e instanceof Error ? e.message : String(e));
    }
  }, [syncSecret]);

  const exportOverridesJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fifer-ranking-overrides.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [overrides]);

  const previewRows = useMemo(() => {
    return overrides.adjustments.slice(0, 12).map((adj) => {
      const eng = enginesList.find((e) => e.id === adj.engineId) ?? getEngineById(adj.engineId);
      const base = eng?.ranking.taskSpecific[adj.taskKey];
      const eff =
        base !== undefined
          ? effectiveTaskScore(base, adj.engineId, adj.taskKey, overrides)
          : null;
      return {
        ...adj,
        engineName: eng?.name ?? adj.engineId,
        base: base ?? null,
        effective: eff,
      };
    });
  }, [overrides, enginesList]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: DEEP_NAVY }}>
      <div className="mx-auto max-w-[1200px] px-4 py-8">
        <div className="grid grid-cols-12 gap-3">
          <header className="col-span-12 flex flex-col gap-2 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500/90">
                Administración
              </p>
              <h1 className="font-fifer-heading text-2xl font-bold text-zinc-50">AI Health</h1>
              <p className="mt-1 max-w-xl text-sm text-zinc-400">
                Coste API real vs créditos consumidos por usuarios (demo). Popularidad ABKupfer / Chicureo.
                Actualizado: {new Date(snapshot.asOfIso).toLocaleString("es-CL")}.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="flex flex-wrap gap-2">
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="Secret sync (si aplica)"
                  value={syncSecret}
                  onChange={(e) => setSyncSecret(e.target.value)}
                  className="min-w-[160px] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 sm:max-w-[200px]"
                />
                <button
                  type="button"
                  onClick={() => void runMetaSync()}
                  disabled={syncStatus === "syncing"}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/15 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} aria-hidden />
                  Meta-Sync proveedores
                </button>
                <button
                  type="button"
                  onClick={() => setRankingOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/50 bg-emerald-600/15 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-600/25"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Forzar actualización de rankings
                </button>
              </div>
              <Link
                href="/admin/telemetry"
                className="rounded-xl border border-[#EAB308]/25 px-4 py-2 text-sm text-[#EAB308] hover:bg-[#EAB308]/10"
              >
                Command Center
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              >
                Salir
              </Link>
            </div>
          </header>

          <AiSyncStatusStrip moduleId="finance" status={syncStatus} message={syncMsg} />

          {toast ? (
            <div
              className="col-span-12 rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-4 py-2 text-sm text-emerald-200"
              role="status"
            >
              {toast}
            </div>
          ) : null}

          <section className="col-span-12 rounded-xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
            <h2 className="font-fifer-heading text-lg font-semibold text-zinc-100">
              API vs créditos (periodo demo)
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              Margen comercial FIFER ≈ {snapshot.marginPercent}% sobre base; escala{" "}
              {fmtCredits(snapshot.creditsPerUsd)} créditos / USD.
            </p>
            <div className="overflow-x-auto rounded-lg border border-white/5">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2 font-medium">Motor</th>
                    <th className="px-3 py-2 font-medium">Costo real API</th>
                    <th className="px-3 py-2 font-medium">Créditos usuarios</th>
                    <th className="px-3 py-2 font-medium">Ingreso equiv.</th>
                    <th className="px-3 py-2 font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.costRows.map((row) => (
                    <tr key={row.engineId} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 font-medium text-zinc-200">{row.engineName}</td>
                      <td className="px-3 py-2.5 tabular-nums text-zinc-400">{fmtUsd(row.realApiCostUsd)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-zinc-300">{fmtCredits(row.userCreditsConsumed)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-zinc-400">{fmtUsd(row.revenueUsdEquivalent)}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums"
                          style={{
                            color: row.marginUsd >= 0 ? EMERALD : "#f87171",
                            backgroundColor:
                              row.marginUsd >= 0 ? "rgba(5, 150, 105, 0.12)" : "rgba(248, 113, 113, 0.1)",
                          }}
                        >
                          {row.marginUsd >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : null}
                          {row.marginUsd >= 0 ? "Ganancia " : "Pérdida "}
                          {fmtUsd(row.marginUsd)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
            <h2 className="font-fifer-heading text-lg font-semibold text-zinc-100">
              Ranking de popularidad
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              Volumen relativo por motor; reparto demo ABKupfer (esmeralda) vs Chicureo (zinc).
            </p>
            <ul className="space-y-4">
              {snapshot.popularity.map((row, idx) => (
                <li key={row.engineId} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-zinc-200">
                      <span className="mr-2 tabular-nums text-zinc-500">#{idx + 1}</span>
                      {row.engineName}
                    </span>
                    <span className="tabular-nums text-zinc-500">{fmtCredits(row.totalCalls)} llamadas</span>
                  </div>
                  <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${row.abkupferPct}%`,
                        backgroundColor: EMERALD,
                      }}
                      title={`ABKupfer ${row.abkupferPct}%`}
                    />
                    <div
                      className="h-full bg-zinc-600"
                      style={{ width: `${row.chicureoPct}%` }}
                      title={`Chicureo ${row.chicureoPct}%`}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
                    <span style={{ color: EMERALD }}>ABKupfer {row.abkupferPct}%</span>
                    <span>Chicureo {row.chicureoPct}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="col-span-12 lg:col-span-5 rounded-xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
            <h2 className="font-fifer-heading text-lg font-semibold text-zinc-100">
              Ajustes de ranking (local)
            </h2>
            <p className="text-xs leading-relaxed text-zinc-500">
              Los deltas se guardan en el navegador como vista previa. Para producción, vuelca el JSON al
              manifiesto en repo.
            </p>
            <button
              type="button"
              onClick={exportOverridesJson}
              className="mt-3 w-full rounded-xl border border-white/15 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Exportar overrides JSON
            </button>
            <div className="mt-4 max-h-[320px] overflow-auto rounded-lg border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0d1424] text-zinc-500">
                  <tr>
                    <th className="px-2 py-1.5">Motor</th>
                    <th className="px-2 py-1.5">Tarea</th>
                    <th className="px-2 py-1.5">Base</th>
                    <th className="px-2 py-1.5">Δ</th>
                    <th className="px-2 py-1.5">Efectivo</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-4 text-center text-zinc-600">
                        Sin ajustes — usa “Forzar actualización”.
                      </td>
                    </tr>
                  ) : (
                    previewRows.map((r) => (
                      <tr key={`${r.engineId}-${r.taskKey}`} className="border-t border-white/5 text-zinc-400">
                        <td className="px-2 py-1.5 text-zinc-300">{r.engineName}</td>
                        <td className="px-2 py-1.5">{r.taskKey}</td>
                        <td className="px-2 py-1.5 tabular-nums">{r.base ?? "—"}</td>
                        <td className="px-2 py-1.5 tabular-nums text-emerald-400/90">
                          {r.delta > 0 ? "+" : ""}
                          {r.delta}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-zinc-200">{r.effective ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {rankingOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ranking-dialog-title"
        >
          <div
            className="w-full max-w-md rounded-xl border border-emerald-600/30 p-5 shadow-xl"
            style={{ backgroundColor: DEEP_NAVY }}
          >
            <h3 id="ranking-dialog-title" className="font-fifer-heading text-lg font-semibold text-zinc-50">
              Ajustar ranking por tarea
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Suma o resta puntuación cuando un modelo mejora o empeora en una especialidad.
            </p>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-xs text-zinc-400">
                Motor
                <select
                  value={engineId}
                  onChange={(e) => setEngineId(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                >
                  {enginesList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-zinc-400">
                Clave de tarea (manifiesto)
                <select
                  value={taskKey}
                  onChange={(e) => setTaskKey(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                  disabled={!taskKeys.length}
                >
                  {taskKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-zinc-400">
                Delta (p. ej. +0.3 mejora, −0.2 empeora)
                <input
                  type="number"
                  step="0.1"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setRankingOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyRankingUpdate}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: EMERALD }}
              >
                Aplicar y recalcular vista
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
