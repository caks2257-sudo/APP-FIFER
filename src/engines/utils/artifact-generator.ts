/**
 * Sistema de artefactos accionables — exportación Chicureo (PDF) y ABKupfer (Markdown / borradores).
 * Consumido desde la UI del Data Canvas (cliente); sin estado global.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Datos no degradados y con carga útil mínima para exportar. */
export function isBoxDataExportable(data: unknown): boolean {
  if (!isRecord(data)) return false;
  const meta = (data.normalized as { meta?: { degraded?: boolean } } | undefined)?.meta ?? (data.meta as { degraded?: boolean } | undefined);
  if (meta?.degraded) return false;
  return true;
}

function financePayloadFromBoxData(data: unknown): { title: string; lines: string[] } {
  if (!isRecord(data)) {
    return { title: "FIFER · Finanzas", lines: ["(sin datos estructurados)"] };
  }
  const norm = data.normalized as { title?: string; metrics?: Record<string, string | number> } | undefined;
  const title =
    (typeof norm?.title === "string" && norm.title.trim()) ||
    (typeof data.title === "string" && data.title.trim()) ||
    "FIFER · Reporte financiero";
  const metrics = (norm?.metrics ?? (data.metrics as Record<string, string | number> | undefined)) ?? {};
  const lines: string[] = [];
  const entries = Object.entries(metrics).filter(([k]) => k !== "_degraded");
  if (entries.length === 0) {
    lines.push("Métricas: —");
  } else {
    lines.push("Métricas:");
    for (const [k, v] of entries) {
      lines.push(`  · ${k}: ${String(v)}`);
    }
  }
  const raw = data.raw as { url?: string; summary?: string; keyPoints?: string[] } | undefined;
  if (raw?.url) lines.push("", `URL origen: ${raw.url}`);
  if (typeof raw?.summary === "string" && raw.summary.trim()) {
    lines.push("", "Resumen:", raw.summary.slice(0, 4000));
  }
  if (Array.isArray(raw?.keyPoints) && raw.keyPoints.length) {
    lines.push("", "Puntos clave:");
    for (const p of raw.keyPoints.slice(0, 20)) {
      lines.push(`  · ${String(p)}`);
    }
  }
  return { title, lines };
}

/** Genera un PDF básico (Chicureo) y devuelve el Blob. */
export async function buildChicureoFinancePdfBlob(data: unknown, options?: { nodeId?: string }): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { title, lines } = financePayloadFromBoxData(data);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const maxW = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("FIFER · Chicureo — Reporte arquitectónico / financiero", margin, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 90);
  doc.text(`Generado: ${new Date().toISOString()}${options?.nodeId ? ` · nodo ${options.nodeId}` : ""}`, margin, y);
  y += 18;
  doc.setTextColor(20, 24, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const titleLines = doc.splitTextToSize(title, maxW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 14 + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const line of lines) {
    const parts = doc.splitTextToSize(line, maxW);
    for (const pl of parts) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(pl, margin, y);
      y += 12;
    }
  }
  return doc.output("blob");
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}

function extractContentMarkdown(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const raw = data.raw as
    | {
        artifacts?: Array<{ type: string; caption: string; hook?: string }>;
        masterPrompt?: string;
      }
    | undefined;
  if (!raw?.artifacts?.length) return null;
  const blocks: string[] = [];
  if (typeof raw.masterPrompt === "string" && raw.masterPrompt.trim()) {
    blocks.push("## Master prompt\n\n", raw.masterPrompt.trim(), "\n\n");
  }
  for (const a of raw.artifacts) {
    const head = `### ${a.type}${a.hook ? ` · ${a.hook}` : ""}`;
    blocks.push(`${head}\n\n${a.caption.trim()}\n\n`);
  }
  return blocks.join("").trim();
}

/** Copia Markdown limpio al portapapeles (ABKupfer). */
export async function copyAbkupferContentMarkdown(data: unknown): Promise<boolean> {
  const md = extractContentMarkdown(data);
  if (!md || typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
  await navigator.clipboard.writeText(md);
  return true;
}

const DRAFTS_KEY = "fifer:canvas:content-drafts";

export type ContentDraftEntry = {
  nodeId: string;
  /** Motor shell que generó el payload (p. ej. content-engine). */
  engineId?: string;
  at: string;
  excerpt: string;
  body: string;
  metadata?: Record<string, unknown>;
};

/** Extrae Markdown exportable para borradores; compartido por API y cola local. */
export function buildContentDraftPayload(data: unknown): { body: string; excerpt: string } | null {
  const md = extractContentMarkdown(data);
  if (!md) return null;
  return { body: md.slice(0, 50000), excerpt: md.slice(0, 240) };
}

/** Respaldo offline — misma cola local que antes de la API. */
export function appendLocalContentDraft(entry: {
  nodeId: string;
  engineId: string;
  excerpt: string;
  body: string;
  metadata?: Record<string, unknown>;
}): boolean {
  if (typeof window === "undefined") return false;
  try {
    const prev = JSON.parse(window.localStorage.getItem(DRAFTS_KEY) || "[]") as ContentDraftEntry[];
    const row: ContentDraftEntry = {
      nodeId: entry.nodeId,
      engineId: entry.engineId,
      at: new Date().toISOString(),
      excerpt: entry.excerpt,
      body: entry.body,
      metadata: entry.metadata,
    };
    const next = [row, ...prev].slice(0, 40);
    window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * @deprecated Usar `pushContentToDrafts` desde `fifer-landing/src/lib/content-drafts-api.ts` (Vault + fallback local).
 */
export function pushContentToLocalDrafts(nodeId: string, data: unknown): boolean {
  const built = buildContentDraftPayload(data);
  if (!built) return false;
  return appendLocalContentDraft({
    nodeId,
    engineId: "unknown",
    excerpt: built.excerpt,
    body: built.body,
  });
}

export function hasFinanceExportPayload(data: unknown): boolean {
  if (!isBoxDataExportable(data)) return false;
  const d = data as { normalized?: { metrics?: Record<string, unknown>; title?: string }; title?: string };
  const title = d.normalized?.title ?? d.title;
  if (typeof title === "string" && title.trim()) return true;
  const metrics = d.normalized?.metrics ?? (data as { metrics?: Record<string, unknown> }).metrics;
  if (metrics && Object.keys(metrics).some((k) => k !== "_degraded")) return true;
  const raw = (data as { raw?: { summary?: string; url?: string } }).raw;
  return Boolean((raw?.summary && raw.summary.trim()) || (raw?.url && raw.url.trim()));
}

export function hasContentExportPayload(data: unknown): boolean {
  if (!isBoxDataExportable(data)) return false;
  return Boolean(extractContentMarkdown(data));
}
