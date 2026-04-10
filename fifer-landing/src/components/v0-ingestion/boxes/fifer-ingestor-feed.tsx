"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getV0BoxChatSystemPrompt, resolveV0BoxPersonaPrompt } from "@/components/v0-ingestion/ai-persona";
import { fiferLayoutSpring } from "@/components/core/fifer-theme";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { persistFiferMutation } from "@/lib/fifer-mutation-api";
import type { BoxProps } from "@/types/fifer-box";

export const FIFER_INGESTOR_FEED_SYSTEM_PROMPT = getV0BoxChatSystemPrompt("fifer-ingestor-feed");

type FeedRow = { id: string; label: string };

const DEFAULT_ROWS: FeedRow[] = [
  { id: "c1", label: "Campaña TikTok — ABKupfer cajas" },
  { id: "c2", label: "Ingesta stock — sync manual" },
  { id: "c3", label: "Borrador meta — Q2 comercial" },
];

export default function FiferIngestorFeedBox({ data, isLoading, boxId }: BoxProps) {
  const chatSystemPrompt = resolveV0BoxPersonaPrompt(boxId, "fifer-ingestor-feed");
  const title =
    data && typeof data === "object" && data !== null && "title" in data
      ? String((data as { title?: string }).title ?? "Ingesta")
      : "Feed de ingestión";

  const [rows, setRows] = useState<FeedRow[]>(DEFAULT_ROWS);

  const dismissRow = (id: string) => {
    const prev = rows;
    void runOptimisticMutation({
      apply: () => setRows((r) => r.filter((x) => x.id !== id)),
      revert: () => setRows(prev),
      request: () =>
        persistFiferMutation({
          kind: "box-action",
          moduleId: "affiliates",
          boxId,
          action: `dismiss-feed:${id}`,
        }),
      errorTitle: "No se archivó la fila",
      errorBody: (err) => `El feed volvió a mostrar el ítem. ${err.message}`,
    });
  };

  return (
    <div
      className="w-full rounded-[0.75rem] border border-[#EAB308]/25 bg-[#0A0F1E] p-2 text-zinc-100"
      data-fifer-ai-persona="fifer-os-core"
      data-fifer-chat-prompt-chars={String(chatSystemPrompt.length)}
      data-fifer-optimistic-ui="true"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#EAB308]">{title}</p>
      {isLoading ? (
        <p className="mt-1 text-xs text-zinc-500">Cargando…</p>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-zinc-500">
            Feed compacto (v0). Archivar quita la fila al instante; rollback si falla la red.
          </p>
          <ul className="mt-2 space-y-1">
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <motion.li
                  key={row.id}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={fiferLayoutSpring}
                  className="flex items-center justify-between gap-2 rounded border border-zinc-800/80 bg-black/20 px-2 py-1.5"
                >
                  <span className="text-[11px] text-zinc-300">{row.label}</span>
                  <button
                    type="button"
                    className="shrink-0 rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:border-amber-500/40 hover:text-amber-200"
                    onClick={() => dismissRow(row.id)}
                  >
                    Archivar
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
    </div>
  );
}
