"use client";

import { Coins, Medal, Sparkles } from "lucide-react";
import type { RefiningMotorComparisonVm } from "@/lib/ai/credit-orchestrator";

const DEEP_NAVY = "#0A0F1E";
const ELECTRIC_YELLOW = "#EAB308";

/**
 * Comparativa de motores + créditos — solo presentación; datos vienen del CreditOrchestrator (VM).
 */
function RefiningMotorComparisonGlass({ vm }: { vm: RefiningMotorComparisonVm }) {
  const { candidates, primaryEstimatedCredits } = vm;
  const [first, second] = candidates;

  return (
    <div
      className="w-full max-w-[min(100%,22rem)] rounded-xl border border-[#EAB308]/20 px-3 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${DEEP_NAVY} 72%, transparent), color-mix(in srgb, ${DEEP_NAVY} 45%, transparent))`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      data-fifer-refining-widget="motor-comparison"
    >
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Comparativa de motores
      </p>

      {first && second ? (
        <div className="flex flex-col gap-2 text-left">
          <div className="flex items-start gap-2">
            <Medal className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ELECTRIC_YELLOW }} strokeWidth={2} aria-hidden />
            <p className="text-[12px] leading-snug text-zinc-300">
              <span className="font-medium text-zinc-100">{first.name}:</span>{" "}
              <span className="tabular-nums font-semibold" style={{ color: ELECTRIC_YELLOW }}>
                {first.displayScore}
              </span>{" "}
              <span className="text-zinc-500">({first.contextLabel})</span>
            </p>
          </div>
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">vs</p>
          <div className="flex items-start gap-2">
            <Medal className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" strokeWidth={2} aria-hidden />
            <p className="text-[12px] leading-snug text-zinc-300">
              <span className="font-medium text-zinc-100">{second.name}:</span>{" "}
              <span className="tabular-nums font-semibold text-zinc-200">{second.displayScore}</span>{" "}
              <span className="text-zinc-500">({second.contextLabel})</span>
            </p>
          </div>
        </div>
      ) : first ? (
        <div className="flex items-start gap-2 text-left">
          <Medal className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ELECTRIC_YELLOW }} strokeWidth={2} aria-hidden />
          <p className="text-[12px] leading-snug text-zinc-300">
            <span className="font-medium text-zinc-100">{first.name}:</span>{" "}
            <span className="tabular-nums font-semibold" style={{ color: ELECTRIC_YELLOW }}>
              {first.displayScore}
            </span>{" "}
            <span className="text-zinc-500">({first.contextLabel})</span>
          </p>
        </div>
      ) : (
        <p className="text-center text-[11px] text-zinc-500">Catálogo de motores no disponible.</p>
      )}

      {first ? (
        <div
          className="mt-3 flex flex-wrap items-center justify-center gap-1.5 border-t border-[#EAB308]/15 pt-3"
          data-fifer-estimated-credits={String(primaryEstimatedCredits)}
        >
          <Coins className="h-3.5 w-3.5 shrink-0" style={{ color: ELECTRIC_YELLOW }} strokeWidth={2.25} aria-hidden />
          <span className="text-[11px] text-zinc-500">Estimado</span>
          <span className="text-[12px] font-semibold tabular-nums text-zinc-100">
            {primaryEstimatedCredits} créditos FIFER
          </span>
          {second ? (
            <span className="w-full text-center text-[10px] text-zinc-600">
              Alternativa · {second.name}: {second.estimatedCredits} créditos
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type RefiningPromptPulseProps = {
  boxId: string;
  /** VM producido por `buildRefiningMotorComparison` en el shell (p. ej. `BoxLoader`). */
  comparison: RefiningMotorComparisonVm;
};

/**
 * Dual-Stage · Etapa 1 — “Pulido de Prompt” (`_xray_PROTOCOL_SHELL.md`).
 * Incluye widget glass de comparativa de motores + estimación de créditos (orquestador).
 */
export function RefiningPromptPulse({ boxId, comparison }: RefiningPromptPulseProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-fifer-shell-state="refining"
      data-box-id={boxId}
      className="flex w-full flex-col items-center justify-center gap-4 rounded-xl border border-[#EAB308]/15 px-4 py-8"
      style={{
        background: `color-mix(in srgb, ${DEEP_NAVY} 88%, transparent)`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-full animate-pulse"
        style={{
          boxShadow: "0 0 28px color-mix(in srgb, var(--fifer-accent, #eab308) 35%, transparent)",
        }}
      >
        <div
          className="absolute inset-0 rounded-full opacity-40 animate-pulse"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--fifer-accent, #eab308) 45%, transparent) 0%, transparent 70%)",
          }}
        />
        <Sparkles
          className="relative z-[1] h-8 w-8 animate-bounce"
          style={{ color: ELECTRIC_YELLOW }}
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
      <div className="text-center">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em] animate-pulse"
          style={{ color: ELECTRIC_YELLOW }}
        >
          Pulido de Prompt
        </p>
        <p className="mt-1 max-w-[260px] text-[12px] leading-snug text-zinc-400">
          Refinando tu instrucción con el motor base antes del resultado final.
        </p>
      </div>

      <RefiningMotorComparisonGlass vm={comparison} />
    </div>
  );
}
