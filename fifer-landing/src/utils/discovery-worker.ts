/**
 * Discovery Worker — Attribute Mapper (Metadata-Driven Architecture).
 * Mapea JSON heterogéneo (Shopify, municipalidad, etc.) a `FiferBoxDataNormalized` / `BoxProps.data`
 * mediante reconocimiento de patrones (fuzzy) sin tocar componentes v0.
 */
import type { BoxProps } from "@/types/fifer-box";
import type {
  DiscoveryFieldTrace,
  FiferBoxDataNormalized,
  FiferCanonicalFieldKey,
} from "@/utils/adapters";
import { toBoxPropsData } from "@/utils/adapters";

/** Umbral mínimo de similitud (0–1) para aceptar un mapeo de clave → canónico. */
const FUZZY_THRESHOLD = 0.42;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Normaliza para comparar: minúsculas, sin acentos, sin separadores. */
export function normalizeKeyToken(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s.-]+/g, "");
}

/** Distancia de Levenshtein (claves cortas, sin dependencias). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  return dp[m]![n]!;
}

/**
 * Sinónimos por token normalizado → campo canónico.
 * Ej.: producttitle, itemname → label (como en Shopify `product_title`).
 */
const CANONICAL_SYNONYM_TOKENS: Record<FiferCanonicalFieldKey, readonly string[]> = {
  title: ["title", "heading", "subject", "titulo", "encabezado", "headline"],
  label: [
    "producttitle",
    "productname",
    "itemname",
    "itemtitle",
    "servicename",
    "nombre",
    "name",
    "label",
    "denominacion",
    "descripcioncorta",
    "shorttitle",
  ],
  name: ["name", "fullname", "nombrecompleto", "razonsocial", "companyname"],
  value: ["value", "valor", "monto", "count", "cantidad", "quantity", "qty"],
  amount: ["amount", "total", "totalprice", "price", "precio", "importe", "subtotal", "grandtotal"],
  address: [
    "address",
    "direccion",
    "street",
    "calle",
    "ubicacion",
    "location",
    "domicilio",
    "dir",
  ],
  owner: [
    "owner",
    "propietario",
    "dueno",
    "dueño",
    "titular",
    "ownername",
    "landlord",
    "responsable",
    "contactname",
  ],
  status: ["status", "estado", "situacion", "phase", "etapa", "workflow"],
  currency: ["currency", "moneda", "curr", "divisa"],
  email: ["email", "correo", "mail"],
  phone: ["phone", "telefono", "tel", "movil", "celular"],
  date: ["date", "fecha", "createdat", "updatedat", "timestamp"],
  id: ["id", "uuid", "code", "codigo", "folio", "externalid"],
};

function bestCanonicalForKey(key: string): { canonical: FiferCanonicalFieldKey; score: number } | null {
  const token = normalizeKeyToken(key);
  if (!token) return null;

  let best: { canonical: FiferCanonicalFieldKey; score: number } | null = null;

  for (const canonical of Object.keys(CANONICAL_SYNONYM_TOKENS) as FiferCanonicalFieldKey[]) {
    const synonyms = CANONICAL_SYNONYM_TOKENS[canonical];
    for (const syn of synonyms) {
      if (token === syn) {
        const s = 1;
        if (!best || s > best.score) best = { canonical, score: s };
        continue;
      }
      if (token.includes(syn) || syn.includes(token)) {
        const longer = Math.max(token.length, syn.length);
        const minLen = Math.min(token.length, syn.length);
        const s = 0.55 + 0.45 * (minLen / Math.max(longer, 1));
        if (!best || s > best.score) best = { canonical, score: Math.min(0.99, s) };
      }
      const dist = levenshtein(token, syn);
      const maxLen = Math.max(token.length, syn.length, 1);
      const sim = 1 - dist / maxLen;
      if (sim >= FUZZY_THRESHOLD && (!best || sim > best.score)) {
        best = { canonical, score: sim };
      }
    }
  }

  return best;
}

function mapScalarValue(value: unknown): string | number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  return undefined;
}

function mapRecord(
  input: Record<string, unknown>,
  trace: DiscoveryFieldTrace[]
): Partial<Record<FiferCanonicalFieldKey, string | number>> {
  const bestByCanonical: Partial<
    Record<FiferCanonicalFieldKey, { score: number; value: string | number; sourceKey: string }>
  > = {};

  for (const [rawKey, rawVal] of Object.entries(input)) {
    if (rawVal !== null && typeof rawVal === "object" && !Array.isArray(rawVal)) {
      continue;
    }
    const match = bestCanonicalForKey(rawKey);
    if (!match || match.score < FUZZY_THRESHOLD) continue;
    const scalar = mapScalarValue(rawVal);
    if (scalar === undefined) continue;

    const prev = bestByCanonical[match.canonical];
    if (!prev || match.score > prev.score) {
      bestByCanonical[match.canonical] = {
        score: match.score,
        value: scalar,
        sourceKey: rawKey,
      };
    }
  }

  const out: Partial<Record<FiferCanonicalFieldKey, string | number>> = {};
  for (const [canonical, cell] of Object.entries(bestByCanonical)) {
    const c = canonical as FiferCanonicalFieldKey;
    out[c] = cell!.value;
    trace.push({ sourceKey: cell!.sourceKey, canonical: c, score: cell!.score });
  }

  return out;
}

/** Detecta arrays de objetos en payloads anidados (Shopify `products`, municipal `expedientes`, etc.). */
function extractObjectArrays(root: Record<string, unknown>): Record<string, unknown>[] {
  const ARRAY_KEYS = [
    "products",
    "productos",
    "items",
    "line_items",
    "lineitems",
    "orders",
    "rows",
    "records",
    "data",
    "results",
    "features",
    "projects",
    "proyectos",
    "expedientes",
    "properties",
    "inmuebles",
  ];

  for (const k of ARRAY_KEYS) {
    const v = root[k];
    if (Array.isArray(v) && v.length && isRecord(v[0])) {
      return v as Record<string, unknown>[];
    }
  }

  if (Array.isArray(root) && root.length && isRecord(root[0])) {
    return root as Record<string, unknown>[];
  }

  return [];
}

function inferSource(root: Record<string, unknown>): FiferBoxDataNormalized["source"] {
  const s = JSON.stringify(root).toLowerCase();
  if (s.includes("shopify") || s.includes("product_title") || s.includes("total_price")) return "shopify";
  if (s.includes("balance") || s.includes("ledger") || s.includes("uf")) return "finance";
  if (s.includes("commission") || s.includes("affiliate")) return "affiliates";
  if (s.includes("municipal") || s.includes("chicureo") || s.includes("regularizacion")) return "generic";
  return "generic";
}

function pickTitle(root: Record<string, unknown>, firstRecord: Partial<Record<FiferCanonicalFieldKey, string | number>>): string {
  const t =
    (typeof root.title === "string" && root.title) ||
    (typeof root.name === "string" && root.name) ||
    (typeof root.shop_name === "string" && root.shop_name) ||
    (typeof firstRecord.title === "string" && firstRecord.title) ||
    (typeof firstRecord.label === "string" && firstRecord.label) ||
    (typeof firstRecord.name === "string" && firstRecord.name);
  return t || "Datos";
}

function buildSeriesFromRecords(
  records: Array<Partial<Record<FiferCanonicalFieldKey, string | number>>>
): Array<{ label: string; value: number }> {
  const series: Array<{ label: string; value: number }> = [];
  const take = Math.min(records.length, 24);
  for (let i = 0; i < take; i++) {
    const r = records[i]!;
    const label =
      (typeof r.label === "string" && r.label) ||
      (typeof r.name === "string" && r.name) ||
      (typeof r.title === "string" && r.title) ||
      `Item ${i + 1}`;
    const num =
      typeof r.value === "number"
        ? r.value
        : typeof r.amount === "number"
          ? r.amount
          : typeof r.value === "string"
            ? Number.parseFloat(r.value)
            : typeof r.amount === "string"
              ? Number.parseFloat(r.amount)
              : Number.NaN;
    if (!Number.isNaN(num)) {
      series.push({ label, value: num });
    }
  }
  return series;
}

function rootMetrics(root: Record<string, unknown>): Record<string, string | number> | undefined {
  const metrics: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(root)) {
    if (v === null || typeof v === "object") continue;
    const m = mapScalarValue(v);
    if (m !== undefined && !Array.isArray(v)) metrics[k] = m;
  }
  return Object.keys(metrics).length ? metrics : undefined;
}

/**
 * Traduce metadata cruda a contrato enriquecido listo para `BoxLoader` / v0.
 * Ej.: `{ product_title: "Roble", price: "42" }` → `canonicalRecords[].label`, `value`/`amount`.
 */
export function mapMetadata(rawData: unknown): BoxProps["data"] {
  if (Array.isArray(rawData)) {
    if (rawData.length === 0) {
      return toBoxPropsData({ source: "generic", title: "Sin filas", raw: rawData });
    }
    if (isRecord(rawData[0])) {
      const trace: DiscoveryFieldTrace[] = [];
      const canonicalRecords = (rawData as unknown[]).filter(isRecord).map((r) =>
        mapRecord(r as Record<string, unknown>, trace)
      );
      const source = inferSource(rawData[0] as Record<string, unknown>);
      const first = canonicalRecords[0] ?? {};
      const title = pickTitle(rawData[0] as Record<string, unknown>, first);
      const series = buildSeriesFromRecords(canonicalRecords);
      const normalized: FiferBoxDataNormalized = {
        source,
        title,
        series: series.length ? series : undefined,
        canonicalRecords,
        discoveryTrace: trace.length ? dedupeTrace(trace) : undefined,
        raw: rawData,
      };
      return toBoxPropsData(normalized);
    }
  }

  if (!isRecord(rawData)) {
    const normalized: FiferBoxDataNormalized = {
      source: "generic",
      title: "Sin estructura",
      raw: rawData,
    };
    return toBoxPropsData(normalized);
  }

  const trace: DiscoveryFieldTrace[] = [];
  const rows = extractObjectArrays(rawData);
  const canonicalRecords: Array<Partial<Record<FiferCanonicalFieldKey, string | number>>> = [];

  if (rows.length) {
    for (const row of rows) {
      canonicalRecords.push(mapRecord(row, trace));
    }
  } else {
    canonicalRecords.push(mapRecord(rawData, trace));
  }

  const source = inferSource(rawData);
  const first = canonicalRecords[0] ?? {};
  const title = pickTitle(rawData, first);
  const series = buildSeriesFromRecords(canonicalRecords);
  const metrics = rootMetrics(rawData);

  const normalized: FiferBoxDataNormalized = {
    source,
    title,
    series: series.length ? series : undefined,
    metrics,
    canonicalRecords: canonicalRecords.length ? canonicalRecords : undefined,
    discoveryTrace: trace.length ? dedupeTrace(trace) : undefined,
    raw: rawData,
  };

  return toBoxPropsData(normalized);
}

function dedupeTrace(traces: DiscoveryFieldTrace[]): DiscoveryFieldTrace[] {
  const byKey = new Map<string, DiscoveryFieldTrace>();
  for (const t of traces) {
    const prev = byKey.get(t.sourceKey);
    if (!prev || t.score > prev.score) byKey.set(t.sourceKey, t);
  }
  return Array.from(byKey.values());
}
