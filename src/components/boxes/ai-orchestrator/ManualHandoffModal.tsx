'use client';

import { useEffect, useState } from 'react';
import { ClipboardCopy, Loader2, X } from 'lucide-react';

export type ManualHandoffKind = 'notebook' | 'cursor';

type ManualHandoffModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ManualHandoffKind;
  isLoading: boolean;
  error: string | null;
  /** NotebookLM: contenido pegado por el usuario */
  notebookDraft: string;
  onNotebookDraftChange: (v: string) => void;
  /** Cursor: prompt a copiar */
  copyPrompt: string;
  /** Cursor: informe pegado */
  progressDraft: string;
  onProgressDraftChange: (v: string) => void;
  onSubmitNotebook: () => void;
  onSubmitCursor: () => void;
};

function copyText(text: string, onDone: () => void) {
  void navigator.clipboard.writeText(text).then(onDone);
}

/**
 * Puente manual obligatorio — NotebookLM o Cursor (Fase 7).
 * z-50 + backdrop Nevado Técnico.
 */
export function ManualHandoffModal({
  open,
  onOpenChange,
  kind,
  isLoading,
  error,
  notebookDraft,
  onNotebookDraftChange,
  copyPrompt,
  progressDraft,
  onProgressDraftChange,
  onSubmitNotebook,
  onSubmitCursor,
}: ManualHandoffModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const title =
    kind === 'notebook'
      ? 'Puente manual: NotebookLM'
      : 'Puente manual: Cursor AI';

  const subtitle =
    kind === 'notebook'
      ? 'Pega el análisis técnico devuelto por NotebookLM para generar el GEMINI_DOC.'
      : 'Copia el activador en Cursor; al terminar el trabajo, pega aquí el informe de progreso y confirma.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aods-manual-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#0A0F1E]/85 backdrop-blur-[2px]"
        aria-label="Cerrar panel"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#EAB308]/30 bg-[#0A0F1E] shadow-[0_0_0_1px_rgba(234,179,8,0.12),0_25px_50px_-12px_rgba(0,0,0,0.65)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#EAB308]/20 px-5 py-4">
          <div>
            <h2
              id="aods-manual-title"
              className="text-lg font-bold tracking-tight text-[#EAB308]"
            >
              {title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {kind === 'cursor' && copyPrompt ? (
            <div className="mb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Prompt para copiar en Cursor
              </p>
              <div className="relative rounded-lg border border-emerald-500/25 bg-[#050810] p-3">
                <pre className="max-h-[min(200px,28vh)] overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-emerald-400/95">
                  {copyPrompt}
                </pre>
                <button
                  type="button"
                  onClick={() =>
                    copyText(copyPrompt, () => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    })
                  }
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-white/10 bg-[#0A0F1E]/95 px-2 py-1 text-[11px] text-slate-200 backdrop-blur-sm transition hover:bg-[#0A0F1E]"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          ) : null}

          {kind === 'notebook' ? (
            <>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Respuesta de NotebookLM
              </label>
              <textarea
                className="min-h-[min(240px,35vh)] w-full resize-y rounded-lg border border-[#EAB308]/25 bg-[#070b14] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#EAB308]/50 focus:outline-none focus:ring-1 focus:ring-[#EAB308]/30"
                placeholder="Pega aquí el análisis crudo de NotebookLM…"
                value={notebookDraft}
                onChange={(e) => onNotebookDraftChange(e.target.value)}
                disabled={isLoading}
              />
            </>
          ) : (
            <>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Informe de progreso (salida Cursor)
              </label>
              <textarea
                className="min-h-[min(240px,35vh)] w-full resize-y rounded-lg border border-[#EAB308]/25 bg-[#070b14] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#EAB308]/50 focus:outline-none focus:ring-1 focus:ring-[#EAB308]/30"
                placeholder="Archivos tocados, pasos, errores resueltos…"
                value={progressDraft}
                onChange={(e) => onProgressDraftChange(e.target.value)}
                disabled={isLoading}
              />
            </>
          )}

          {error ? (
            <div
              className="mt-3 rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-white/[0.06] bg-[#070b14]/80 px-5 py-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              if (kind === 'notebook') onSubmitNotebook();
              else onSubmitCursor();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#EAB308] py-4 text-base font-bold tracking-wide text-[#0A0F1E] shadow-lg shadow-black/30 transition hover:bg-[#f5d04a] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Procesando…
              </>
            ) : (
              'Entregado'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
