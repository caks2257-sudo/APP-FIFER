/**
 * Data Weaver — fusión determinista de filas de varios módulos en un objeto alineado al
 * contrato de `BoxProps.data` / capa `normalized` (`_xray_PROTOCOL_SHELL.md`, `adapters.ts`).
 */

export type WeaverCriterion = "date" | "roi";

export type WeaverSource = "finance" | "shopify" | "affiliates" | "generic";

export type WeaverModuleSlice<Row extends Record<string, unknown> = Record<string, unknown>> = {
  moduleId: string;
  source: WeaverSource;
  rows: Row[];
};

/** Salida compatible con `FiferBoxDataNormalized` + envoltorio para gráficos polimórficos. */
export type WovenBoxData = {
  source: "generic";
  title: string;
  series: Array<{ label: string; value: number }>;
  metrics: Record<string, string | number>;
  canonicalRecords: Array<Record<string, string | number>>;
  wovenFrom: string[];
  criterion: WeaverCriterion;
  raw: { slices: WeaverModuleSlice[] };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickNumber(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string") {
      const n = Number.parseFloat(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

function pickDateKey(row: Record<string, unknown>): string | undefined {
  const keys = ["date", "fecha", "day", "period", "created_at", "timestamp", "at"];
  for (const k of keys) {
    const v = row[k];
    if (v === undefined || v === null) continue;
    return String(v);
  }
  return undefined;
}

function pickRoi(row: Record<string, unknown>): number | undefined {
  return pickNumber(row.roi, row.ROI, row.returnOnInvestment, row.margin, row.profit, row.value);
}

function rowLabel(row: Record<string, unknown>, criterion: WeaverCriterion, idx: number): string {
  if (criterion === "date") {
    const d = pickDateKey(row);
    if (d) return d.slice(0, 16);
  }
  const name =
    (typeof row.name === "string" && row.name) ||
    (typeof row.title === "string" && row.title) ||
    (typeof row.label === "string" && row.label) ||
    (typeof row.project === "string" && row.project);
  if (name) return name;
  return `item-${idx + 1}`;
}

function rowValue(row: Record<string, unknown>, criterion: WeaverCriterion): number {
  if (criterion === "roi") {
    const r = pickRoi(row);
    if (r !== undefined) return r;
  }
  const v =
    pickNumber(
      row.amount,
      row.value,
      row.total,
      row.sales,
      row.revenue,
      row.uf,
      row.count,
      row.quantity,
    ) ?? 0;
  return v;
}

/**
 * Une filas de N módulos en una serie única y registros canónicos para tablas/charts SDUI.
 */
export function weaveModuleData(slices: WeaverModuleSlice[], criterion: WeaverCriterion): WovenBoxData {
  const wovenFrom = slices.map((s) => s.moduleId);
  const merged: Array<{ row: Record<string, unknown>; source: WeaverSource; moduleId: string }> = [];
  for (const s of slices) {
    for (const row of s.rows) {
      if (!isRecord(row)) continue;
      merged.push({ row, source: s.source, moduleId: s.moduleId });
    }
  }

  const series: Array<{ label: string; value: number }> = [];
  const canonicalRecords: Array<Record<string, string | number>> = [];

  merged.forEach((m, i) => {
    const label = rowLabel(m.row, criterion, i);
    const value = rowValue(m.row, criterion);
    series.push({ label: `${m.moduleId}: ${label}`, value });
    canonicalRecords.push({
      label,
      value,
      date: pickDateKey(m.row) ?? "",
      module: m.moduleId,
      source: m.source,
    });
  });

  const metrics: Record<string, string | number> = {
    rows: merged.length,
    modules: wovenFrom.length,
    criterion,
  };

  return {
    source: "generic",
    title: `Tejido · ${criterion.toUpperCase()} (${wovenFrom.join(" + ") || "sin módulos"})`,
    series,
    metrics,
    canonicalRecords,
    wovenFrom,
    criterion,
    raw: { slices },
  };
}

/**
 * Envoltorio listo para `BoxProps.data` (capa `normalized` como en `toBoxPropsData`).
 */
export function wovenToBoxPropsData(woven: WovenBoxData): Record<string, unknown> {
  return {
    ...woven,
    normalized: woven,
  };
}
