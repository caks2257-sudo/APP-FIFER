"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { DataNode } from "@/components/core/DataNode";
import type { BoxProps } from "@/types/fifer-box";

type ScrapingResult = {
  title?: string;
  summary?: string;
  keyPoints?: string[];
  canonicalRecords?: Array<Record<string, unknown>>;
};

function normalizeTags(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as ScrapingResult;

  if (Array.isArray(data.keyPoints)) {
    return data.keyPoints.filter((item): item is string => typeof item === "string").slice(0, 6);
  }

  if (Array.isArray(data.canonicalRecords)) {
    return data.canonicalRecords
      .map((entry) => (typeof entry?.snippet === "string" ? entry.snippet : ""))
      .filter(Boolean)
      .slice(0, 6);
  }

  return [];
}

function getResultData(engineData: unknown, fallbackData: unknown): ScrapingResult | null {
  const candidate = (engineData ?? fallbackData) as ScrapingResult | null | undefined;
  if (!candidate || typeof candidate !== "object") return null;
  return candidate;
}

export default function ScrapingUrlBox(props: BoxProps) {
  const [url, setUrl] = useState("");
  const [runError, setRunError] = useState<string | null>(null);

  const hasEngine = Boolean(props.engine?.run);
  const isBusy = Boolean(props.engine?.isLoading);
  const isRefining = Boolean(props.engine?.isRefining || props.isRefining);

  const extracted = useMemo(
    () => getResultData(props.engine?.data, props.data),
    [props.engine?.data, props.data]
  );

  const title = extracted?.title?.trim() || "Sin título detectado";
  const description = extracted?.summary?.trim() || "No se pudo sintetizar una descripción en esta extracción.";
  const tags = normalizeTags(extracted);
  const hasData = Boolean(extracted && (extracted.title || extracted.summary || tags.length > 0));

  async function handleExtract() {
    setRunError(null);
    if (!hasEngine || !props.engine) {
      setRunError("El motor no está disponible en este Box.");
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      setRunError("Ingresa una URL para iniciar la extracción.");
      return;
    }

    try {
      await props.engine.run("scraping", { url: trimmed, targetModule: "content" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falló la extracción de inteligencia.";
      setRunError(message);
    }
  }

  return (
    <div
      className="w-full rounded-xl border border-cyan-400/30 bg-[#0A0F1E] p-4 text-zinc-100 shadow-[0_18px_36px_rgba(0,0,0,0.35)]"
      data-fifer-box="scraping-url-box"
      data-fifer-biome="scraping"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-cyan-300">Scraping Intelligence</p>
      <h3 className="mt-1 text-base font-bold text-zinc-50">Extrae señales clave desde una URL</h3>

      <div className="mt-4 flex flex-col gap-3">
        <label htmlFor="scraping-url-input" className="text-xs font-semibold text-zinc-400">
          URL objetivo
        </label>
        <input
          id="scraping-url-input"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://sitio.com/articulo"
          className="w-full rounded-xl border border-indigo-400/30 bg-[#111827]/85 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-300/20"
        />
        <button
          type="button"
          onClick={() => void handleExtract()}
          disabled={isBusy}
          className="inline-flex items-center justify-center rounded-xl border border-cyan-300/50 bg-gradient-to-r from-cyan-500/20 to-indigo-500/30 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:from-cyan-500/30 hover:to-indigo-500/45 disabled:cursor-wait disabled:opacity-60"
        >
          {isBusy ? "Extrayendo..." : "Extraer Inteligencia"}
        </button>
      </div>

      {isRefining ? (
        <div className="mt-4 rounded-xl border border-[#EAB308]/35 bg-[#0B1220] p-3">
          <div className="flex items-center gap-2 text-[#FDE68A]">
            <Sparkles className="h-4 w-4 animate-pulse text-[#EAB308]" />
            <div>
              <p className="text-xs font-semibold">Pulido de Prompt</p>
              <p className="text-[11px] text-zinc-400">Refinando la instrucción para extraer señales de alto valor.</p>
            </div>
          </div>
        </div>
      ) : null}

      {runError ? (
        <p role="alert" className="mt-4 rounded-lg border border-rose-400/40 bg-rose-950/25 px-3 py-2 text-xs text-rose-200">
          {runError}
        </p>
      ) : null}

      {hasData && !isRefining ? (
        <div className="mt-6 rounded-[0.75rem] border border-white/5 bg-[#0A0F1E]/50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Inteligencia Extraida</h4>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-500">Arrastra los nodos a otro Box</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {extracted?.title ? (
              <DataNode id={`title-${Date.now()}`} type="text" label="Titulo" value={title} />
            ) : null}

            {extracted?.summary ? (
              <DataNode id={`desc-${Date.now()}`} type="text" label="Descripcion" value={description} />
            ) : null}

            {tags.length
              ? tags.map((tag, index) => (
                  <DataNode key={`tag-${index}`} id={`tag-${index}-${Date.now()}`} type="tag" label="Tag" value={tag} />
                ))
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
