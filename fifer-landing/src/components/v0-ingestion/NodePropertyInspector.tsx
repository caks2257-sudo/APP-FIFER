"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Copy, FileDown, Inbox, Play, Sparkles, X, Zap } from "lucide-react";
import type { BoxProps } from "@/types/fifer-box";
import { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";
import { pushContentToDrafts } from "@/lib/content-drafts-api";
import { SHELL_ENGINE_IDS } from "@/utils/adapters/engine-bridge";
import {
  buildChicureoFinancePdfBlob,
  copyAbkupferContentMarkdown,
  hasContentExportPayload,
  hasFinanceExportPayload,
  isBoxDataExportable,
  triggerBlobDownload,
} from "../../../../src/engines/utils/artifact-generator";

export type NodeRunMode = "auto" | "manual";

export type NodeDataStatus = "idle" | "success" | "error";

export type CanvasNodeForInspector = {
  id: string;
  type: string;
  label: string;
  value: unknown;
  runMode?: NodeRunMode;
  promptOverride?: string;
};

type ArtifactSparkId = "pdf" | "copy" | "draft" | null;

type NodePropertyInspectorProps = {
  node: CanvasNodeForInspector;
  dataStatus: NodeDataStatus;
  /** Último payload del motor (para exportar); ausente tras re-ejecución o error. */
  engineBoxData?: BoxProps["data"] | null;
  isProcessing: boolean;
  onClose: () => void;
  onRunModeChange: (mode: NodeRunMode) => void;
  onPromptOverrideChange: (value: string) => void;
  onRunNow: () => void;
};

function isContentNodeType(type: string): boolean {
  return type.toLowerCase().includes("content");
}

function resolveCanvasEngineId(nodeType: string): string {
  const t = nodeType.toLowerCase();
  if (t.includes("content")) return SHELL_ENGINE_IDS.content;
  return SHELL_ENGINE_IDS.finance;
}

function statusBadgeClass(status: NodeDataStatus): string {
  switch (status) {
    case "success":
      return "border-emerald-500/50 bg-emerald-500/15 text-emerald-300";
    case "error":
      return "border-red-500/50 bg-red-500/15 text-red-300";
    default:
      return "border-zinc-500/40 bg-zinc-800/60 text-zinc-400";
  }
}

function statusLabel(status: NodeDataStatus): string {
  return status.toUpperCase();
}

const ghostArtifactBtn =
  "flex w-full items-center justify-center gap-2 rounded-lg border border-[#EAB308]/55 bg-transparent px-3 py-2 text-[12px] font-semibold text-zinc-200 transition hover:border-[#EAB308] hover:bg-[#EAB308]/10 hover:text-[#FEF9C3] disabled:cursor-not-allowed disabled:opacity-40";

export function NodePropertyInspector({
  node,
  dataStatus,
  engineBoxData,
  isProcessing,
  onClose,
  onRunModeChange,
  onPromptOverrideChange,
  onRunNow,
}: NodePropertyInspectorProps) {
  const runMode = node.runMode ?? "auto";
  const showPrompt = isContentNodeType(node.type);

  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const [sparkId, setSparkId] = useState<ArtifactSparkId>(null);

  const triggerSpark = useCallback((id: NonNullable<ArtifactSparkId>) => {
    setSparkId(id);
    window.setTimeout(() => setSparkId(null), 700);
  }, []);

  const showArtifactToast = useCallback((ok: boolean, message: string) => {
    setToast({ ok, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const exportable =
    dataStatus === "success" &&
    engineBoxData != null &&
    isBoxDataExportable(engineBoxData);

  const showFinanceArtifacts = exportable && !isContentNodeType(node.type) && hasFinanceExportPayload(engineBoxData);
  const showContentArtifacts = exportable && isContentNodeType(node.type) && hasContentExportPayload(engineBoxData);

  const onPdf = async () => {
    if (!engineBoxData) return;
    try {
      const blob = await buildChicureoFinancePdfBlob(engineBoxData, { nodeId: node.id });
      triggerBlobDownload(blob, `fifer-chicureo-${node.id.slice(0, 8)}.pdf`);
      triggerSpark("pdf");
      showArtifactToast(true, "Reporte PDF generado (Chicureo).");
    } catch {
      showArtifactToast(false, "No se pudo generar el PDF.");
    }
  };

  const onCopyMd = async () => {
    if (!engineBoxData) return;
    const ok = await copyAbkupferContentMarkdown(engineBoxData);
    if (ok) {
      triggerSpark("copy");
      showArtifactToast(true, "Post copiado al portapapeles (Markdown).");
    } else {
      showArtifactToast(false, "No hay texto refinado para copiar.");
    }
  };

  const onDraft = async () => {
    if (!engineBoxData) return;
    const engineId = resolveCanvasEngineId(node.type);
    const ok = await pushContentToDrafts({
      nodeId: node.id,
      engineId,
      data: engineBoxData,
      metadata: { nodeType: node.type, nodeLabel: node.label },
    });
    if (ok) {
      triggerSpark("draft");
      showArtifactToast(true, "Borrador enviado al Vault (o cola local si hubo fallo de red).");
    } else {
      showArtifactToast(false, "No se pudo enviar a borradores.");
    }
  };

  const sparkClass = (id: NonNullable<ArtifactSparkId>) =>
    sparkId === id ? "animate-fifer-artifact-spark ring-1 ring-[#EAB308]/60" : "";

  const toastEl =
    typeof document !== "undefined" && toast
      ? createPortal(
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              position: "fixed",
              bottom: 72,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10060,
              maxWidth: "min(420px, 92vw)",
              padding: "10px 16px",
              borderRadius: "0.75rem",
              border: `1px solid ${toast.ok ? `${FIFER_ELECTRIC_YELLOW}55` : "#7f1d1d"}`,
              background: "var(--fifer-navy, #0a0f1e)",
              color: toast.ok ? "#fef9c3" : "#fecaca",
              fontSize: 13,
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            }}
          >
            {toast.message}
          </motion.div>,
          document.body
        )
      : null;

  return (
    <>
      {toastEl}
      <aside
        className="flex h-full min-h-[300px] w-full flex-col border-l border-white/10 bg-[#0A0F1E]/95 shadow-[inset_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-xl md:min-w-[300px] md:max-w-[360px]"
        aria-label="Inspector de propiedades del nodo"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-blue-300">Nodo</p>
            <h4 className="mt-1 text-sm font-semibold text-zinc-50">Propiedades</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
            aria-label="Cerrar inspector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">ID</p>
            <p className="break-all rounded-md border border-white/10 bg-black/20 px-2 py-1.5 font-mono text-[11px] text-zinc-300">
              {node.id}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tipo</p>
            <p className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-zinc-200">{node.type}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Estado de datos</p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(dataStatus)}`}
              >
                {statusLabel(dataStatus)}
              </span>
              {isProcessing ? (
                <span className="text-[10px] text-zinc-500">Motor en ejecución…</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Run mode</p>
            <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => onRunModeChange("auto")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-semibold transition ${
                  runMode === "auto"
                    ? "bg-[#2563EB]/35 text-zinc-50 shadow-inner ring-1 ring-[#2563EB]/50"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                Auto
              </button>
              <button
                type="button"
                onClick={() => onRunModeChange("manual")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-semibold transition ${
                  runMode === "manual"
                    ? "bg-[#2563EB]/35 text-zinc-50 shadow-inner ring-1 ring-[#2563EB]/50"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Manual
              </button>
            </div>
            <p className="text-[10px] leading-snug text-zinc-500">
              En <span className="text-zinc-400">manual</span> el nodo no dispara automáticamente la cadena downstream;
              usa &quot;Ejecutar ahora&quot; o doble clic.
            </p>
          </div>

          {showPrompt ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Prompt override</p>
              <textarea
                value={node.promptOverride ?? ""}
                onChange={(e) => onPromptOverrideChange(e.target.value)}
                placeholder="Vacío = usa etiqueta + valor del nodo como intención base."
                rows={6}
                className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-[#EAB308]/50 focus:outline-none focus:ring-1 focus:ring-[#EAB308]/40"
              />
            </div>
          ) : null}

          {showFinanceArtifacts || showContentArtifacts ? (
            <div className="space-y-2 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#EAB308]" aria-hidden />
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Acciones de artefacto</p>
              </div>
              <p className="text-[10px] leading-snug text-zinc-600">
                Extrae el valor del nodo hacia PDF (Chicureo) o Markdown / borradores (ABKupfer).
              </p>
              {showFinanceArtifacts ? (
                <button
                  type="button"
                  className={`${ghostArtifactBtn} ${sparkClass("pdf")}`}
                  onClick={() => void onPdf()}
                  disabled={isProcessing}
                >
                  <FileDown className="h-4 w-4 text-[#EAB308]" />
                  Descargar Reporte PDF
                </button>
              ) : null}
              {showContentArtifacts ? (
                <>
                  <button
                    type="button"
                    className={`${ghostArtifactBtn} ${sparkClass("copy")}`}
                    onClick={() => void onCopyMd()}
                    disabled={isProcessing}
                  >
                    <Copy className="h-4 w-4 text-[#EAB308]" />
                    Copiar Post
                  </button>
                  <button
                    type="button"
                    className={`${ghostArtifactBtn} ${sparkClass("draft")}`}
                    onClick={onDraft}
                    disabled={isProcessing}
                  >
                    <Inbox className="h-4 w-4 text-[#EAB308]" />
                    Enviar a Borradores
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="mt-auto border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onRunNow}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#EAB308]/40 bg-[#EAB308]/10 px-3 py-2.5 text-sm font-semibold text-[#FDE047] transition hover:bg-[#EAB308]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Ejecutar ahora
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
