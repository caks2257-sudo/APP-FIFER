'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import JSZip from 'jszip';
import { useState } from 'react';

type IngestApiResponse = {
  success?: boolean;
  files?: Record<string, string>;
  error?: string;
};

export type IngestControlWidgetProps = {
  w?: number;
  h?: number;
  context?: string;
};

function formatSnapshotTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

export default function IngestControlWidget({
  w = 12,
  h = 6,
  context = 'desarrollador',
}: IngestControlWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [buttonLabel, setButtonLabel] = useState('Generar Snapshot');
  const [loadingLabel, setLoadingLabel] = useState<string>('Ejecutando ingesta del repositorio...');
  const [error, setError] = useState<string | null>(null);
  const [lastExportInfo, setLastExportInfo] = useState<{ filesCount: number; fileKeys: string[] } | null>(null);
  const [includeCode, setIncludeCode] = useState(true);
  const [includeXrays, setIncludeXrays] = useState(true);
  const [includeAudit, setIncludeAudit] = useState(true);
  const minHeight = `${Math.max(320, h * 52)}px`;

  const selectionCount = [includeCode, includeXrays, includeAudit].filter(Boolean).length;

  const handleGenerateSnapshot = async () => {
    if (selectionCount === 0) {
      setError('Debes seleccionar al menos una fuente de contexto antes de continuar.');
      return;
    }

    setIsLoading(true);
    setButtonLabel('Generar Snapshot');
    setLoadingLabel('Ejecutando ingesta del repositorio...');
    setError(null);
    setLastExportInfo(null);

    try {
      const response = await fetch('/api/v1/system/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          options: {
            code: includeCode === true,
            xrays: includeXrays === true,
            audit: includeAudit === true,
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as IngestApiResponse;
      if (!response.ok || !data.success || !data.files || typeof data.files !== 'object') {
        setError(data.error ?? `No fue posible generar el snapshot (HTTP ${response.status}).`);
        setButtonLabel('Generar Snapshot');
        setIsLoading(false);
        return;
      }

      const filesDict = data.files as Record<string, string>;
      const fileKeys = Object.keys(filesDict).sort();

      if (fileKeys.length === 0) {
        setError('El servidor no devolvió archivos para descargar.');
        setButtonLabel('Generar Snapshot');
        setIsLoading(false);
        return;
      }

      setLoadingLabel('Empaquetando ZIP...');
      setButtonLabel('Empaquetando ZIP...');

      try {
        const zip = new JSZip();
        for (const fileName of fileKeys) {
          zip.file(fileName, filesDict[fileName]);
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const timestamp = formatSnapshotTimestamp(new Date());
        const zipName = `FIFER_SNAPSHOT_${timestamp}.zip`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', zipName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setLastExportInfo({ filesCount: fileKeys.length, fileKeys });
      } catch {
        setError('No se pudo empaquetar o descargar el ZIP.');
      } finally {
        setButtonLabel('Generar Snapshot');
        setIsLoading(false);
      }
    } catch {
      setError('Error de red al ejecutar la ingesta del repositorio.');
      setButtonLabel('Generar Snapshot');
      setIsLoading(false);
    }
  };

  return (
    <section
      className="@container rounded-2xl border border-[#EAB308]/35 bg-gradient-to-br from-[#0A0F1E] via-[#0E172A] to-[#111827] p-4 shadow-[0_20px_45px_-30px_rgba(234,179,8,0.45)] @[540px]:p-5 @[820px]:p-6"
      style={{ minHeight }}
      data-layout-w={w}
      data-layout-h={h}
      data-context={context}
    >
      <header className="flex flex-col gap-3 border-b border-[#EAB308]/20 pb-4 @[540px]:flex-row @[540px]:items-start @[540px]:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#94A3B8]">
            System Engine · Auditoria IA
          </p>
          <h3 className="mt-1 text-base font-semibold text-[#F9FAFB] @[560px]:text-lg">
            Control de Ingesta Arquitectonica
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#CBD5E1]">
            El backend devuelve fragmentos Markdown listos; se empaquetan en un solo ZIP con marca de
            tiempo para NotebookLM u otras herramientas.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Admin
        </span>
      </header>

      <div className="mt-5 flex flex-col gap-3 @[700px]:gap-4">
        <div className="grid gap-2 @[740px]:grid-cols-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#334155] bg-[#0B1220]/70 px-3 py-2.5 text-sm text-[#E2E8F0] transition hover:border-[#EAB308]/45">
            <input
              type="checkbox"
              checked={includeCode}
              onChange={(event) => setIncludeCode(event.target.checked)}
              className="h-4 w-4 accent-[#EAB308]"
              disabled={isLoading}
            />
            <span>Codigo Fuente (src/)</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#334155] bg-[#0B1220]/70 px-3 py-2.5 text-sm text-[#E2E8F0] transition hover:border-[#EAB308]/45">
            <input
              type="checkbox"
              checked={includeXrays}
              onChange={(event) => setIncludeXrays(event.target.checked)}
              className="h-4 w-4 accent-[#EAB308]"
              disabled={isLoading}
            />
            <span>X-Rays &amp; Planos Arquitectonicos</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#334155] bg-[#0B1220]/70 px-3 py-2.5 text-sm text-[#E2E8F0] transition hover:border-[#EAB308]/45">
            <input
              type="checkbox"
              checked={includeAudit}
              onChange={(event) => setIncludeAudit(event.target.checked)}
              className="h-4 w-4 accent-[#EAB308]"
              disabled={isLoading}
            />
            <span>Archivos de Auditoria (Prisma, package.json, env)</span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleGenerateSnapshot}
          disabled={isLoading || selectionCount === 0}
          className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-[#EAB308]/45 bg-[#EAB308]/20 px-4 py-3 text-sm font-semibold text-[#FDE68A] transition hover:bg-[#EAB308]/30 disabled:cursor-not-allowed disabled:opacity-70 @[540px]:min-h-[3.2rem]"
        >
          {buttonLabel}
        </button>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#0B1220]/75 px-3 py-2 text-sm text-[#C5D4EA]">
            <Loader2 className="h-4 w-4 animate-spin text-[#EAB308]" aria-hidden />
            <span>{loadingLabel}</span>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {lastExportInfo ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-100">
              ZIP generado con{' '}
              <span className="font-mono text-emerald-200/90">{lastExportInfo.filesCount} archivos .md</span>
            </p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-emerald-100/95">
              {lastExportInfo.fileKeys.map((file) => (
                <li key={file} className="font-mono text-[12px]">
                  {file}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
