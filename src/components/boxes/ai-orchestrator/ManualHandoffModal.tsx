'use client';

import { useEffect, useRef, useState } from 'react';
import { ClipboardCopy, FileUp, Loader2, X } from 'lucide-react';

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
  /** Fase 1 — prompt maestro (NOTEBOOK_PROMPT) para copiar en NotebookLM */
  notebookPromptToCopy?: string;
  /** Mientras el documento NOTEBOOK_PROMPT aún no está en servidor */
  notebookPromptLoading?: boolean;
  /** Tras polling sin obtener prompt (opcional) */
  notebookPromptUnavailable?: boolean;
  /** Cursor: prompt a copiar */
  copyPrompt: string;
  /** Cursor: informe pegado */
  progressDraft: string;
  onProgressDraftChange: (v: string) => void;
  onSubmitNotebook: () => void;
  onSubmitCursor: () => void;
  /** Línea bajo el título: transparencia de motor (Fase 1 o Fase 7) */
  motorSubtitle?: string;
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
  notebookPromptToCopy = '',
  notebookPromptLoading = false,
  notebookPromptUnavailable = false,
  copyPrompt,
  progressDraft,
  onProgressDraftChange,
  onSubmitNotebook,
  onSubmitCursor,
  motorSubtitle,
}: ManualHandoffModalProps) {
  const [copiedNotebook, setCopiedNotebook] = useState(false);
  const [copiedCursor, setCopiedCursor] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notebookDraftRef = useRef(notebookDraft);
  const progressDraftRef = useRef(progressDraft);
  notebookDraftRef.current = notebookDraft;
  progressDraftRef.current = progressDraft;

  useEffect(() => {
    if (open) {
      setCopiedNotebook(false);
      setCopiedCursor(false);
      setIsReadingFile(false);
    }
  }, [open]);

  if (!open) return null;

  const title =
    kind === 'notebook'
      ? 'Puente manual: NotebookLM'
      : 'Puente manual: Cursor AI';

  const defaultSubtitle =
    kind === 'notebook'
      ? 'Pega el análisis técnico devuelto por NotebookLM para generar el GEMINI_DOC.'
      : 'Copia el activador en Cursor; al terminar el trabajo, pega aquí el informe de progreso y confirma.';

  const textareaDisabled = isLoading || isReadingFile;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.txt') && !lower.endsWith('.md')) {
      e.target.value = '';
      return;
    }
    setIsReadingFile(true);
    const inputEl = e.target;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (kind === 'notebook') {
        const prev = notebookDraftRef.current.trim();
        onNotebookDraftChange(prev ? `${prev}\n\n${text}` : text);
      } else {
        const prev = progressDraftRef.current.trim();
        onProgressDraftChange(prev ? `${prev}\n\n${text}` : text);
      }
      setIsReadingFile(false);
      inputEl.value = '';
    };
    reader.onerror = () => {
      setIsReadingFile(false);
      inputEl.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

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
            {motorSubtitle ? (
              <p className="mt-1 text-[11px] font-medium text-emerald-400/90">
                {motorSubtitle}
              </p>
            ) : null}
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{defaultSubtitle}</p>
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
          {kind === 'notebook' ? (
            <>
              {notebookPromptLoading && !notebookPromptToCopy ? (
                <div
                  className="mb-4 flex items-center gap-2 rounded-lg border border-[#EAB308]/20 bg-[#050810] px-3 py-3 text-xs text-slate-400"
                  role="status"
                >
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#EAB308]" aria-hidden />
                  Generando prompt maestro (Fase 1) en servidor…
                </div>
              ) : null}

              {notebookPromptUnavailable && !notebookPromptToCopy ? (
                <div
                  className="mb-4 rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2 text-xs text-amber-100"
                  role="status"
                >
                  El prompt maestro aún no está disponible. Espera unos segundos, cierra y vuelve a
                  abrir el puente, o revisa la consola de telemetría.
                </div>
              ) : null}

              {notebookPromptToCopy ? (
                <div className="mb-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Prompt maestro (copiar en NotebookLM)
                  </p>
                  <div className="relative rounded-lg border border-[#EAB308]/25 bg-[#050810] p-3">
                    <pre className="max-h-[min(220px,30vh)] overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#EAB308]/95">
                      {notebookPromptToCopy}
                    </pre>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(notebookPromptToCopy, () => {
                          setCopiedNotebook(true);
                          window.setTimeout(() => setCopiedNotebook(false), 2000);
                        })
                      }
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-white/10 bg-[#0A0F1E]/95 px-2 py-1 text-[11px] text-slate-200 backdrop-blur-sm transition hover:bg-[#0A0F1E]"
                    >
                      <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                      {copiedNotebook ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

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
                      setCopiedCursor(true);
                      window.setTimeout(() => setCopiedCursor(false), 2000);
                    })
                  }
                  className="absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-white/10 bg-[#0A0F1E]/95 px-2 py-1 text-[11px] text-slate-200 backdrop-blur-sm transition hover:bg-[#0A0F1E]"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                  {copiedCursor ? 'Copiado' : 'Copiar'}
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
                disabled={textareaDisabled}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,text/plain"
                  className="sr-only"
                  aria-label="Importar archivo de texto"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  disabled={textareaDisabled}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#EAB308]/30 bg-[#0A0F1E] px-2.5 py-1.5 text-[11px] font-medium text-[#EAB308] transition hover:bg-[#EAB308]/10 disabled:opacity-50"
                >
                  {isReadingFile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <FileUp className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Importar .txt / .md
                </button>
                {isReadingFile ? (
                  <span className="text-[11px] text-slate-500">Leyendo archivo…</span>
                ) : null}
              </div>
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
                disabled={textareaDisabled}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,text/plain"
                  className="sr-only"
                  aria-label="Importar informe desde archivo"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  disabled={textareaDisabled}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-[#0A0F1E] px-2.5 py-1.5 text-[11px] font-medium text-emerald-400/95 transition hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  {isReadingFile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <FileUp className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Importar .txt / .md
                </button>
                {isReadingFile ? (
                  <span className="text-[11px] text-slate-500">Leyendo archivo…</span>
                ) : null}
              </div>
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
            disabled={isLoading || isReadingFile}
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
