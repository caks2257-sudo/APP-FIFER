"use client";

import { useCallback, useEffect, useState } from "react";
import { GitMerge, Loader2, Sparkles } from "lucide-react";

import type { FusionOpportunity } from "@/schemas/fusion-proposal.schema";

type FusionApiResponse = {
  ok?: boolean;
  error?: string;
  scannedAt?: string;
  engineCount?: number;
  opportunities?: FusionOpportunity[];
  issues?: { engineDir: string; message: string }[];
};

type PrepareResponse = {
  ok?: boolean;
  error?: string;
  targetSlug?: string;
  proposalDir?: string;
  masterPromptPath?: string;
  masterPrompt?: string;
  memberSlugs?: string[];
};

function riskBadgeClass(risk: string): string {
  switch (risk) {
    case "low":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-400";
    case "medium":
      return "border-amber-500/35 bg-amber-500/10 text-amber-300";
    case "high":
      return "border-orange-500/35 bg-orange-500/10 text-orange-300";
    case "critical":
      return "border-red-500/40 bg-red-500/10 text-red-400";
    default:
      return "border-zinc-600 bg-zinc-800/50 text-zinc-400";
  }
}

export function EvolutionAuditPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FusionApiResponse | null>(null);
  const [targetSlugs, setTargetSlugs] = useState<Record<string, string>>({});
  const [prepareBusy, setPrepareBusy] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [lastPaths, setLastPaths] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/evolution-fusion");
      const json = (await res.json()) as FusionApiResponse;
      if (!json.ok) {
        setError(json.error ?? "No se pudo cargar el auditor.");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError("Red o servidor no disponible.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onPrepare = useCallback(
    async (opp: FusionOpportunity) => {
      const slugs = opp.members.map((m) => m.report.id);
      const clusterKey = opp.clusterId;
      const target =
        (targetSlugs[clusterKey]?.trim() && targetSlugs[clusterKey]) ||
        `core-${slugs.sort().join("-").slice(0, 40)}`.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-");

      setPrepareBusy(clusterKey);
      setLastPrompt(null);
      setLastPaths(null);
      try {
        const res = await fetch("/api/dev/prepare-core-proposal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberSlugs: slugs, targetSlug: target }),
        });
        const json = (await res.json()) as PrepareResponse;
        if (json.ok && json.masterPrompt) {
          setError(null);
          setLastPrompt(json.masterPrompt);
          setLastPaths(
            [json.proposalDir, json.masterPromptPath].filter(Boolean).join("\n") || null
          );
        } else {
          setError(json.error ?? "Error al preparar propuesta Core.");
        }
      } catch {
        setError("Error de red al preparar Core.");
      } finally {
        setPrepareBusy(null);
      }
    },
    [targetSlugs]
  );

  if (loading) {
    return (
      <section
        className="rounded-lg border border-[#EAB308]/25 bg-[#0A0F1E]/80 p-4"
        aria-label="Auditor de evolución"
        data-evolution-audit="loading"
      >
        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#EAB308]" aria-hidden />
          Escaneando engine_report.json…
        </div>
      </section>
    );
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-[#EAB308]/25 bg-[#0A0F1E]/80 p-4"
      aria-label="Auditor de evolución"
      data-evolution-audit="panel"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#EAB308]">Ciclo de evolución</p>
          <h2 className="mt-1 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <GitMerge className="h-4 w-4 text-[#EAB308]" aria-hidden />
            Oportunidades de mejora (fusión)
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
            Agrupa motores autodescubiertos con entradas, salidas o vocabulario similar. Usa Data Weaver con{" "}
            <code className="text-zinc-400">experimental</code> para comparar ROI/exactitud antes de promover.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="shrink-0 rounded-md border border-zinc-600 px-2 py-1 text-[10px] font-medium uppercase text-zinc-400 hover:border-[#EAB308]/40 hover:text-[#FDE68A]"
        >
          Actualizar
        </button>
      </div>

      {error ? <p className="text-[12px] text-red-400">{error}</p> : null}

      {data?.issues && data.issues.length > 0 ? (
        <ul className="space-y-1 text-[11px] text-amber-300/90">
          {data.issues.map((iss, i) => (
            <li key={i}>
              <span className="text-zinc-500">{iss.engineDir}:</span> {iss.message}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-[11px] text-zinc-500">
        Motores detectados: <span className="text-zinc-300">{data?.engineCount ?? 0}</span>
        {data?.scannedAt ? (
          <>
            {" "}
            · <time dateTime={data.scannedAt}>{new Date(data.scannedAt).toLocaleString()}</time>
          </>
        ) : null}
      </p>

      {!data?.opportunities?.length ? (
        <p className="text-[12px] text-zinc-500">
          No hay clústeres de fusión (se necesitan al menos dos motores con I/O o palabras clave parecidas). Añade otro
          engine en <code className="text-zinc-400">user_space/.../engines/</code> y ejecuta{" "}
          <code className="text-zinc-400">npm run fifer:discover-engines</code>.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.opportunities.map((opp) => {
            const c = opp.comparison;
            return (
              <li
                key={opp.clusterId}
                className="rounded-md border border-zinc-700/60 bg-[#0f172a]/50 p-3"
                data-fusion-cluster={opp.clusterId}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-zinc-200">{opp.clusterId}</span>
                  <span className="rounded border border-zinc-600 px-1.5 py-0.5 text-[9px] uppercase text-zinc-500">
                    {opp.primaryReason}
                  </span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase ${riskBadgeClass(c.accumulatedRisk)}`}
                  >
                    riesgo {c.accumulatedRisk}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    eficacia ~{c.logicalEfficiencyScore} · redundancia {c.redundancyLevel}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{c.redundancyNarrative}</p>
                <ul className="mt-2 space-y-0.5 text-[10px] text-zinc-500">
                  {opp.members.map((m) => (
                    <li key={m.boxId}>
                      <code className="text-zinc-400">{m.report.id}</code> — {m.report.name} ({m.report.risk})
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-[10px] text-zinc-500">
                    Slug Core propuesto
                    <input
                      value={targetSlugs[opp.clusterId] ?? ""}
                      onChange={(e) =>
                        setTargetSlugs((prev) => ({ ...prev, [opp.clusterId]: e.target.value }))
                      }
                      placeholder={`core-${opp.members[0]?.report.id ?? "motor"}-unified`}
                      className="rounded-md border border-zinc-600 bg-[#0A0F1E] px-2 py-1.5 text-[12px] text-zinc-200 placeholder:text-zinc-600"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={prepareBusy === opp.clusterId}
                    onClick={() => void onPrepare(opp)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[#EAB308]/50 bg-[#EAB308]/10 px-3 py-2 text-[11px] font-semibold text-[#FDE68A] hover:bg-[#EAB308]/20 disabled:opacity-50"
                  >
                    {prepareBusy === opp.clusterId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Preparar para Core
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {lastPrompt ? (
        <div className="space-y-2 border-t border-zinc-700/50 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Master Prompt de Fusión</p>
          {lastPaths ? (
            <p className="whitespace-pre-wrap font-mono text-[10px] text-emerald-400/90">{lastPaths}</p>
          ) : null}
          <textarea
            readOnly
            value={lastPrompt}
            rows={12}
            className="w-full resize-y rounded-md border border-zinc-700 bg-[#020617] p-2 font-mono text-[10px] leading-relaxed text-zinc-300"
          />
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(lastPrompt)}
            className="text-[11px] font-medium text-[#FDE68A] hover:text-[#EAB308]"
          >
            Copiar al portapapeles
          </button>
        </div>
      ) : null}
    </section>
  );
}
