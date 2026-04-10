"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  getV0BoxChatSystemPrompt,
  resolveV0BoxPersonaPrompt,
} from "@/components/v0-ingestion/ai-persona";
import { fiferLayoutSpring } from "@/components/core/fifer-theme";
import { dispatchFiferAlert } from "@/store/useAlertStore";
import type { BoxProps } from "@/types/fifer-box";
import type { VisionAnalyzeResponse } from "@/types/vision-analyze";

export const FIFER_VISION_SLOT_SYSTEM_PROMPT = getV0BoxChatSystemPrompt("fifer-vision-slot");

export default function FiferVisionSlotBox({ boxId, isLoading }: BoxProps) {
  const chatSystemPrompt = resolveV0BoxPersonaPrompt(boxId, "fifer-vision-slot");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<VisionAnalyzeResponse | null>(null);

  const previewRef = useRef<string | null>(null);

  const analyzeFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      dispatchFiferAlert({
        level: "WARNING",
        title: "Formato no válido",
        body: "Arrastra una imagen (JPEG, PNG, WebP).",
      });
      return;
    }
    setBusy(true);
    setResult(null);
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);

    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch("/api/vision/analyze", { method: "POST", body: fd });
      const json = (await res.json()) as VisionAnalyzeResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setResult(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      dispatchFiferAlert({
        level: "WARNING",
        title: "No se analizó la imagen",
        body: msg,
      });
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void analyzeFile(f);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const f = e.clipboardData.files?.[0];
    if (f?.type.startsWith("image/")) {
      e.preventDefault();
      void analyzeFile(f);
    }
  };

  const onAction = (label: string) => {
    dispatchFiferAlert({
      level: "IA_INSIGHT",
      title: "Vision Slot · Etapa 1",
      body: `${label} — conecta el motor de finanzas o trámites en la siguiente iteración.`,
    });
  };

  return (
    <div
      className="w-full rounded-[0.75rem] border border-[#EAB308]/25 bg-[#0A0F1E] p-3 text-zinc-100"
      style={{ borderColor: "color-mix(in srgb, var(--fifer-accent,#22D3EE) 30%, transparent)" }}
      data-fifer-ai-persona="fifer-os-core"
      data-fifer-chat-prompt-chars={String(chatSystemPrompt.length)}
      data-fifer-vision-slot="true"
      onPaste={onPaste}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fifer-accent,#22D3EE)]">
        Vision Slot · plano o factura
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        Etapa 1 (gratuita): arrastra una foto, o pega desde el portapapeles. OCR + sugerencias automáticas.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          if (f) void analyzeFile(f);
          ev.target.value = "";
        }}
      />

      <motion.div
        layout
        transition={fiferLayoutSpring}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="mt-3 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-600 bg-zinc-950/40 px-3 py-4 text-center outline-none transition-colors hover:border-[color:var(--fifer-accent,#22D3EE)]/50 focus-visible:ring-2 focus-visible:ring-[color:var(--fifer-accent,#22D3EE)]">
        {busy || isLoading ? (
          <span className="text-sm text-zinc-400">Analizando imagen…</span>
        ) : (
          <>
            <span className="text-sm text-zinc-300">Suelta aquí o haz clic para elegir</span>
            <span className="mt-1 text-[11px] text-zinc-500">También: Ctrl+V con imagen en el portapapeles</span>
          </>
        )}
        {dragOver ? (
          <span className="text-xs font-medium text-[color:var(--fifer-accent,#22D3EE)]">Suelta para cargar</span>
        ) : null}
      </motion.div>

      {preview && !busy ? (
        <motion.div
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 overflow-hidden rounded-md border border-zinc-700/60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Vista previa" className="max-h-40 w-full object-contain" />
        </motion.div>
      ) : null}

      {result ? (
        <motion.div
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fiferLayoutSpring}
          className="mt-3 space-y-2 rounded-lg border border-zinc-700/50 bg-black/25 p-3"
        >
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Texto extraído ({result.source === "gemini" ? "Gemini Flash" : "demo local"})
          </p>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{result.extractedText}</pre>
          <div className="flex flex-wrap gap-2 pt-1">
            {result.suggestedActions.map((a) => (
              <button
                key={a.id}
                type="button"
                className="rounded-md border border-amber-500/40 bg-amber-950/30 px-2 py-1 text-left text-[11px] text-amber-100 hover:bg-amber-900/40"
                onClick={() => onAction(a.label)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
