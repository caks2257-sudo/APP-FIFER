"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  getV0BoxChatSystemPrompt,
  resolveV0BoxPersonaPrompt,
} from "@/components/v0-ingestion/ai-persona";
import { fiferLayoutSpring } from "@/components/core/fifer-theme";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { persistFiferMutation } from "@/lib/fifer-mutation-api";
import type { BoxProps } from "@/types/fifer-box";

/** System prompt estático (mismo Box) — para APIs / tests. */
export const FIFER_FINANCE_SNAPSHOT_SYSTEM_PROMPT =
  getV0BoxChatSystemPrompt("fifer-finance-snapshot");

export default function FiferFinanceSnapshotBox({ data, isLoading, boxId }: BoxProps) {
  const chatSystemPrompt = resolveV0BoxPersonaPrompt(boxId, "fifer-finance-snapshot");
  const title =
    data && typeof data === "object" && data !== null && "title" in data
      ? String((data as { title?: string }).title ?? "Finanzas")
      : "Finanzas";

  const [budgetApproved, setBudgetApproved] = useState(false);

  const approveBudget = () => {
    const prev = budgetApproved;
    void runOptimisticMutation({
      apply: () => setBudgetApproved(true),
      revert: () => setBudgetApproved(prev),
      request: () =>
        persistFiferMutation({
          kind: "box-action",
          moduleId: "finance",
          boxId,
          action: "approve-budget",
        }),
      errorTitle: "Presupuesto no confirmado",
      errorBody: (err) => `El estado volvió a pendiente. ${err.message}`,
    });
  };

  return (
    <div
      className="w-full rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E] p-3 text-zinc-100"
      style={{ borderColor: "color-mix(in srgb, var(--fifer-accent, #D97706) 25%, transparent)" }}
      data-fifer-ai-persona="fifer-os-core"
      data-fifer-chat-prompt-chars={String(chatSystemPrompt.length)}
      data-fifer-optimistic-ui="true"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fifer-primary,#059669)]">
        {title}
      </p>
      {isLoading ? (
        <p className="mt-2 text-sm text-zinc-500">Cargando…</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-zinc-400">Snapshot financiero (v0 — datos vía `data`).</p>
          <motion.div
            layout
            transition={fiferLayoutSpring}
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/30 px-3 py-2"
          >
            <span className="text-sm text-zinc-300">
              Presupuesto operativo ·{" "}
              <strong className={budgetApproved ? "text-emerald-400" : "text-amber-200"}>
                {budgetApproved ? "Aprobado" : "Pendiente"}
              </strong>
            </span>
            <button
              type="button"
              disabled={budgetApproved}
              className="rounded-md border border-emerald-600/50 bg-emerald-950/50 px-3 py-1 text-xs font-medium text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={approveBudget}
            >
              Aprobar presupuesto
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}
