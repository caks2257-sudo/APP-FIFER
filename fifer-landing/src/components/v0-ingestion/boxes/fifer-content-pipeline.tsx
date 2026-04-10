"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getV0BoxChatSystemPrompt, resolveV0BoxPersonaPrompt } from "@/components/v0-ingestion/ai-persona";
import { fiferLayoutSpring } from "@/components/core/fifer-theme";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { persistFiferMutation } from "@/lib/fifer-mutation-api";
import type { BoxProps } from "@/types/fifer-box";

/** Prompt base pipeline; `content-google-shopping` usa variante en `resolveV0BoxPersonaPrompt`. */
export const FIFER_CONTENT_PIPELINE_SYSTEM_PROMPT =
  getV0BoxChatSystemPrompt("fifer-content-pipeline");

type DraftRow = { id: string; title: string; status: "borrador" | "enviado" };

const DEFAULT_DRAFTS: DraftRow[] = [
  { id: "d1", title: "Reel Chicureo — fase II", status: "borrador" },
  { id: "d2", title: "Carrusel ABKupfer stock", status: "borrador" },
  { id: "d3", title: "Story campaña Q2", status: "borrador" },
];

function initialDrafts(data: BoxProps["data"]): DraftRow[] {
  if (data && typeof data === "object" && data !== null && "drafts" in data) {
    const raw = (data as { drafts?: unknown }).drafts;
    if (Array.isArray(raw) && raw.length) {
      return raw
        .map((row, i) => {
          if (!row || typeof row !== "object") return null;
          const r = row as { id?: string; title?: string; status?: string };
          return {
            id: typeof r.id === "string" ? r.id : `d${i}`,
            title: typeof r.title === "string" ? r.title : "Borrador",
            status: r.status === "enviado" ? "enviado" : "borrador",
          } satisfies DraftRow;
        })
        .filter((x): x is DraftRow => x !== null);
    }
  }
  return DEFAULT_DRAFTS;
}

export default function FiferContentPipelineBox({ data, isLoading, boxId }: BoxProps) {
  const chatSystemPrompt = resolveV0BoxPersonaPrompt(boxId, "fifer-content-pipeline");
  const title =
    data && typeof data === "object" && data !== null && "title" in data
      ? String((data as { title?: string }).title ?? "Contenido")
      : "Pipeline editorial";

  const [drafts, setDrafts] = useState<DraftRow[]>(() => initialDrafts(data));
  const mod = "content";

  const list = useMemo(() => drafts.filter((d) => d.status === "borrador"), [drafts]);

  const removeDraft = (id: string) => {
    const prev = drafts;
    void runOptimisticMutation({
      apply: () => setDrafts((d) => d.filter((x) => x.id !== id)),
      revert: () => setDrafts(prev),
      request: () =>
        persistFiferMutation({
          kind: "box-action",
          moduleId: mod,
          boxId,
          action: `remove-draft:${id}`,
        }),
      errorTitle: "Borrador no eliminado",
      errorBody: (err) => `El ítem volvió a la lista. ${err.message}`,
    });
  };

  const sendDraft = (id: string) => {
    const prev = drafts;
    void runOptimisticMutation({
      apply: () =>
        setDrafts((d) => d.map((x) => (x.id === id ? { ...x, status: "enviado" as const } : x))),
      revert: () => setDrafts(prev),
      request: () =>
        persistFiferMutation({
          kind: "box-action",
          moduleId: mod,
          boxId,
          action: `send-draft:${id}`,
        }),
      errorTitle: "Envío no confirmado",
      errorBody: (err) => `El estado del borrador se revirtió. ${err.message}`,
    });
  };

  return (
    <div
      className="w-full rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E] p-4 text-zinc-100"
      style={{ borderColor: "color-mix(in srgb, var(--fifer-primary,#1E3A5F) 35%, transparent)" }}
      data-fifer-ai-persona="fifer-os-core"
      data-fifer-chat-prompt-chars={String(chatSystemPrompt.length)}
      data-fifer-optimistic-ui="true"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fifer-accent,#22D3EE)]">
        {title}
      </p>
      {isLoading ? (
        <p className="mt-2 text-sm text-zinc-500">Cargando…</p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Pipeline editorial (v0). Las acciones aplican al instante; el servidor confirma en segundo plano.
          </p>
          <ul className="mt-4 space-y-2">
            <AnimatePresence initial={false}>
              {list.map((row) => (
                <motion.li
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={fiferLayoutSpring}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/60 bg-zinc-900/40 px-3 py-2"
                >
                  <span className="text-sm text-zinc-200">{row.title}</span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-emerald-600/50 bg-emerald-950/40 px-2 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-900/50"
                      onClick={() => sendDraft(row.id)}
                    >
                      Enviar
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:border-red-500/50 hover:text-red-300"
                      onClick={() => removeDraft(row.id)}
                    >
                      Quitar
                    </button>
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {list.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">Sin borradores pendientes en esta vista.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
