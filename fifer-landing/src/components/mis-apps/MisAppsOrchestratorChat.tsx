"use client";

import { useCallback, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { RefiningPromptPulse } from "@/components/core/RefiningPromptPulse";
import {
  analyzeOrchestratorIntent,
  formatScaffoldPreviewText,
  type EngineProposal,
  type OrchestratorAnalysisResult,
} from "@/core/ai-orchestrator";
import { buildRefiningMotorComparison } from "@/lib/ai/credit-orchestrator";

const ORCH_BOX_ID = "mis-apps-orchestrator";
const AFFILIATE_YELLOW = "#EAB308";

/** Misma estructura que `RefiningSkeleton` en `BoxLoader` (Pulido de Prompt). */
function ChatRefiningSkeleton() {
  return (
    <div
      className="fifer-refining-border-pulse w-full space-y-3 rounded-lg border border-[#EAB308]/30 bg-[#0A0F1E]/90 p-4"
      data-fifer-refining-skeleton="true"
    >
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#EAB308]" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="fifer-ghost-shimmer h-2.5 w-[78%] rounded-md bg-[#EAB308]/12" />
          <div className="fifer-ghost-shimmer h-2.5 w-[52%] rounded-md bg-[#EAB308]/10" />
          <div className="fifer-ghost-shimmer h-16 w-full rounded-md bg-[#1e293b]/80" />
        </div>
      </div>
    </div>
  );
}

export function MisAppsOrchestratorChat() {
  const [input, setInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refiningTask, setRefiningTask] = useState("");
  const [result, setResult] = useState<OrchestratorAnalysisResult | null>(null);
  const [scaffoldLog, setScaffoldLog] = useState<string | null>(null);
  const [scaffoldBusy, setScaffoldBusy] = useState(false);

  const comparison = useMemo(
    () => buildRefiningMotorComparison({ task: refiningTask.trim() || "Analizando intención…" }),
    [refiningTask]
  );

  const runAnalysis = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt) return;
    setIsRefining(true);
    setRefiningTask(prompt);
    setResult(null);
    setScaffoldLog(null);
    await new Promise((r) => setTimeout(r, 520));
    setResult(analyzeOrchestratorIntent(prompt));
    setIsRefining(false);
    setRefiningTask("");
  }, [input]);

  const onGenerateEngine = useCallback(async () => {
    const proposal = result?.proposal;
    if (!proposal) return;
    setScaffoldBusy(true);
    setScaffoldLog(null);
    const text = formatScaffoldPreviewText(proposal);
    try {
      const res = await fetch("/api/dev/scaffold-user-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: proposal.slug,
          content: text,
          engineReport: proposal.engineReportDraft,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        path?: string;
        engineReportPath?: string;
        error?: string;
      };
      if (json.ok && json.path) {
        setScaffoldLog(
          `Escrito: ${json.path}${json.engineReportPath ? `\nengine_report.json: ${json.engineReportPath}` : ""}\n\nEjecuta npm run fifer:discover-engines para regenerar el mapa USER_ENGINE_REPORTS.\n\n${text}`
        );
      } else {
        setScaffoldLog(`[fallback] ${json.error ?? "API no disponible"}\n\n${text}`);
      }
    } catch {
      setScaffoldLog(`[fallback] Red / servidor\n\n${text}`);
    } finally {
      setScaffoldBusy(false);
    }
  }, [result?.proposal]);

  const downloadTmp = useCallback(() => {
    const proposal = result?.proposal;
    if (!proposal) return;
    const blob = new Blob([formatScaffoldPreviewText(proposal)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fifer-engine-scaffold-${proposal.slug}.tmp`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result?.proposal]);

  return (
    <section
      className="flex h-full min-h-[420px] flex-col rounded-[0.75rem] border border-[#EAB308]/25 bg-[#0A0F1E]/90 p-4 shadow-[0_0_24px_rgba(234,179,8,0.06)]"
      data-fifer-mis-apps-orchestrator="true"
      data-fifer-refining={isRefining ? "true" : "false"}
    >
      <header className="mb-3 border-b border-[#EAB308]/15 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: AFFILIATE_YELLOW }}>
          AI Orchestrator
        </p>
        <h2 className="mt-1 font-semibold text-zinc-100">Crear engines</h2>
        <p className="mt-1 text-[12px] leading-snug text-zinc-500">
          Describe qué necesitas; comparamos con el catálogo oficial y proponemos scaffolding en user_space.
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {isRefining ? (
          <div className="space-y-3">
            <ChatRefiningSkeleton />
            <RefiningPromptPulse boxId={ORCH_BOX_ID} comparison={comparison} />
          </div>
        ) : result ? (
          <div className="space-y-2 rounded-lg border border-zinc-700/60 bg-[#111827]/40 p-3 text-[13px] text-zinc-300">
            <p className="text-[12px] text-zinc-400">{result.coverageSummary}</p>
            {result.needsNewEngine && result.proposal ? (
              <ProposalSummary proposal={result.proposal} />
            ) : (
              <p className="text-[12px] text-emerald-400/90">No hace falta un motor nuevo: usa los Boxes oficiales del módulo detectado.</p>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-zinc-500">Ej.: «Quiero scrapear mi web de pisos ABKupfer».</p>
        )}

        {scaffoldLog ? (
          <pre className="max-h-48 overflow-auto rounded-md border border-[#EAB308]/20 bg-black/30 p-2 text-[10px] leading-relaxed text-zinc-400">
            {scaffoldLog}
          </pre>
        ) : null}
      </div>

      <div className="mt-auto space-y-2 border-t border-[#EAB308]/15 pt-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe tu intención…"
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-600/80 bg-[#0f172a]/80 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-[#EAB308]/50 focus:outline-none focus:ring-1 focus:ring-[#EAB308]/30"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runAnalysis()}
            disabled={isRefining || !input.trim()}
            className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-[12px] font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Analizar
          </button>
          <button
            type="button"
            onClick={onGenerateEngine}
            disabled={!result?.proposal || isRefining || scaffoldBusy}
            className="rounded-lg px-3 py-2 text-[12px] font-semibold text-[#0A0F1E] transition enabled:cursor-pointer enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: AFFILIATE_YELLOW, border: `1px solid ${AFFILIATE_YELLOW}` }}
          >
            {scaffoldBusy ? "Generando…" : "Generar Engine"}
          </button>
          <button
            type="button"
            onClick={downloadTmp}
            disabled={!result?.proposal || isRefining}
            className="rounded-lg border border-[#EAB308]/40 bg-transparent px-3 py-2 text-[12px] font-medium text-[#FDE68A] transition hover:bg-[#EAB308]/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Descargar .tmp
          </button>
        </div>
      </div>
    </section>
  );
}

function ProposalSummary({ proposal }: { proposal: EngineProposal }) {
  return (
    <div className="space-y-2 border-t border-zinc-700/50 pt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Propuesta</p>
      <p className="font-medium text-zinc-100">{proposal.title}</p>
      <p className="text-[12px] text-zinc-400">{proposal.rationale}</p>
      <p className="text-[11px] text-zinc-500">
        Inputs: {proposal.inputs.map((i) => i.id).join(", ")} · Outputs: {proposal.outputs.map((o) => o.id).join(", ")}
      </p>
    </div>
  );
}
