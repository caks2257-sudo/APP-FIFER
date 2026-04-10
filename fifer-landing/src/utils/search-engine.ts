/**
 * Semantic Neural Search — no depende solo de coincidencia literal.
 * Cruza intención (lexicón + señales de mocks) con documentos indexados y entradas tipo X-Ray.
 *
 * Ej.: "problemas en Chicureo" → proyectos con alertas / estados críticos en finanzas inmobiliarias.
 */
import { contentMockData } from "@/mocks/content-data";
import { financeMockData } from "@/mocks/finance-data";
import { MOCK_AFFILIATE_FEED_DATA } from "@/mocks/affiliate-data";
import type { AffiliateMockRaw } from "@/mocks/affiliate-data";

/** Intenciones detectables en español (clústeres sinónimos / afines). */
export const SEMANTIC_INTENT_CLUSTERS = {
  problem: [
    "problema",
    "problemas",
    "alerta",
    "alertas",
    "error",
    "errores",
    "rojo",
    "riesgo",
    "riesgos",
    "atraso",
    "atrasos",
    "falta",
    "faltan",
    "incidente",
    "bloqueo",
    "crítico",
    "critico",
    "urgente",
    "pendiente",
    "rechazo",
    "demora",
  ],
  chicureo: [
    "chicureo",
    "inmobiliaria",
    "inmobiliario",
    "valle",
    "loteo",
    "lote",
    "obra",
    "obras",
    "regularización",
    "regularizacion",
    "municipalidad",
    "dom",
    "recepción",
    "recepcion",
    "cerro",
    "sector",
    "cliente",
    "casa",
  ],
  finance_flow: [
    "uf",
    "flujo",
    "caja",
    "finanzas",
    "presupuesto",
    "balance",
    "transaccion",
    "transacción",
    "auditoria",
    "auditoría",
  ],
  abkupfer: [
    "abkupfer",
    "madera",
    "stock",
    "inventario",
    "sku",
    "campaña",
    "campañas",
    "shopping",
    "google",
    "meta",
    "roble",
    "pino",
  ],
  affiliate: [
    "afiliado",
    "afiliados",
    "comisión",
    "comision",
    "red",
    "partner",
    "commission",
  ],
} as const;

export type SemanticIntentId = keyof typeof SEMANTIC_INTENT_CLUSTERS;

export type SearchDocumentKind = "project" | "campaign" | "product" | "affiliate" | "xray" | "module";

/** Documento indexado: texto + pistas de intención (no solo keywords exactas). */
export interface SearchDocument {
  id: string;
  kind: SearchDocumentKind;
  title: string;
  snippet: string;
  href?: string;
  /** Términos y frases para matching flexible. */
  semanticTags: string[];
  /** Alineación con `SEMANTIC_INTENT_CLUSTERS` (ids). */
  intentHints: SemanticIntentId[];
  /** Señales de riesgo / alerta (mock o derivado). */
  riskSignals?: { hasAlerts: boolean; severity: "none" | "amber" | "red" };
}

export interface SemanticSearchHit extends SearchDocument {
  relevanceScore: number;
  matchedIntents: SemanticIntentId[];
  /** Breve explicación para UI (debug / confianza). */
  matchReason: string;
}

const STOPWORDS = new Set([
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "de",
  "del",
  "en",
  "y",
  "o",
  "a",
  "al",
  "con",
  "por",
  "para",
  "que",
  "se",
  "es",
  "son",
  "como",
]);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeToken(w: string): string {
  return stripAccents(w.toLowerCase().trim()).replace(/[^a-z0-9áéíóúñü]/gi, "");
}

/** Tokeniza y normaliza la consulta. */
export function tokenizeQuery(q: string): string[] {
  return q
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Expande términos con sinónimos de los clústeres cuya intención ya matchea la query. */
export function expandTermsWithIntentSynonyms(
  baseTerms: string[],
  intents: Set<SemanticIntentId>
): Set<string> {
  const out = new Set(baseTerms);
  Array.from(intents).forEach((id) => {
    const cluster = SEMANTIC_INTENT_CLUSTERS[id];
    for (const w of cluster) {
      out.add(normalizeToken(w));
    }
  });
  return out;
}

/** Detecta intenciones a partir de la consulta (palabras y substrings). */
export function inferQueryIntents(query: string): Set<SemanticIntentId> {
  const q = stripAccents(query.toLowerCase());
  const found = new Set<SemanticIntentId>();
  (Object.keys(SEMANTIC_INTENT_CLUSTERS) as SemanticIntentId[]).forEach((intentId) => {
    const cluster = SEMANTIC_INTENT_CLUSTERS[intentId];
    for (const phrase of cluster) {
      const p = stripAccents(phrase.toLowerCase());
      if (q.includes(p) || tokenizeQuery(query).includes(normalizeToken(phrase))) {
        found.add(intentId);
        break;
      }
    }
  });
  return found;
}

function projectSeverity(p: {
  alerts: readonly string[] | string[];
  status: string;
  progress: number;
}): "none" | "amber" | "red" {
  if (p.alerts.length >= 2) return "red";
  if (p.alerts.length === 1) return "amber";
  if (p.progress < 50 && p.status !== "Aprobado") return "amber";
  return "none";
}

/** Construye el corpus desde mocks + entradas X-Ray protocolo. */
export function buildSearchCorpus(): SearchDocument[] {
  const out: SearchDocument[] = [];

  for (const p of financeMockData.projects) {
    const sev = projectSeverity(p);
    const hasAlerts = p.alerts.length > 0;
    const blob = [p.name, p.location, p.status, p.fee, String(p.progress), ...p.alerts].join(" ");
    out.push({
      id: `project:${p.id}`,
      kind: "project",
      title: p.name,
      snippet: `${p.location} · ${p.status} · ${p.fee}${hasAlerts ? ` · Alertas: ${p.alerts.join("; ")}` : ""}`,
      href: "/finance/auditoria",
      semanticTags: tokenizeQuery(blob),
      intentHints: [
        "chicureo",
        "finance_flow",
        ...(hasAlerts || sev !== "none" ? (["problem"] as const) : []),
      ],
      riskSignals: { hasAlerts, severity: sev },
    });
  }

  for (const inv of contentMockData.inventory) {
    const trendNorm = stripAccents(inv.trend.toLowerCase());
    const critical = trendNorm.includes("critica");
    out.push({
      id: `product:${normalizeToken(inv.name)}`,
      kind: "product",
      title: inv.name,
      snippet: `${contentMockData.brand} · Stock ${inv.stock} · ${inv.price} · Tendencia ${inv.trend}`,
      href: "/content/generar",
      semanticTags: tokenizeQuery(`${inv.name} ${inv.trend} ${inv.stock} madera piso`),
      intentHints: ["abkupfer", ...(critical ? (["problem"] as const) : [])],
      riskSignals: { hasAlerts: critical, severity: critical ? "red" : "none" },
    });
  }

  for (const c of contentMockData.campaigns) {
    const paused = c.status.toLowerCase().includes("pausada") || c.status.includes("API");
    out.push({
      id: `campaign:${normalizeToken(c.title)}`,
      kind: "campaign",
      title: c.title,
      snippet: `${c.platform} · ${c.status}`,
      href: "/content/generar",
      semanticTags: tokenizeQuery(`${c.title} ${c.platform} ${c.status}`),
      intentHints: ["abkupfer", ...(paused ? (["problem"] as const) : [])],
    });
  }

  const affRaw = (MOCK_AFFILIATE_FEED_DATA as { raw?: AffiliateMockRaw }).raw;
  if (affRaw) {
    for (const n of affRaw.networks) {
      const bad = n.status !== "healthy";
      out.push({
        id: `affiliate:net:${n.id}`,
        kind: "affiliate",
        title: n.name,
        snippet: `Red afiliados · estado ${n.status} · ${n.activePublishers} publishers`,
        href: "/dashboard",
        semanticTags: tokenizeQuery(`${n.name} ${n.status} red afiliados`),
        intentHints: ["affiliate", ...(bad ? (["problem"] as const) : [])],
        riskSignals: { hasAlerts: bad, severity: bad ? "amber" : "none" },
      });
    }
    for (const line of affRaw.commissionLines) {
      out.push({
        id: `affiliate:cm:${line.id}`,
        kind: "affiliate",
        title: line.label,
        snippet: `${line.materialFamily} · ${line.state} · ${line.saleAmountClp.toLocaleString("es-CL")} CLP`,
        href: "/dashboard",
        semanticTags: tokenizeQuery(`${line.label} ${line.materialFamily} ${line.state}`),
        intentHints: ["affiliate", ...(line.state === "pending" ? (["problem"] as const) : [])],
      });
    }
  }

  out.push(
    {
      id: "xray:protocol-shell",
      kind: "xray",
      title: "PROTOCOL_SHELL — Living OS",
      snippet:
        "Contrato de layout 12 cols, BoxLoader, PageOrchestrator y persistencia Zustand. Base para X-Ray en dashboard.",
      semanticTags: tokenizeQuery("protocol shell living os layout box orchestrator zustand"),
      intentHints: ["chicureo", "finance_flow"],
    },
    {
      id: "xray:integrations",
      kind: "xray",
      title: "X-Ray Integraciones — Chicureo / Municipal / Google",
      snippet:
        "Pautas de APIs externas: datos inmobiliarios Chicureo, visibilidad Google Shopping, colas de ingestión.",
      semanticTags: tokenizeQuery("integraciones chicureo municipal google shopping api"),
      intentHints: ["chicureo", "abkupfer", "problem"],
    },
    {
      id: "xray:semantic-search",
      kind: "xray",
      title: "Búsqueda semántica FIFER",
      snippet:
        "Motor de intención sobre mocks y protocolo: problemas, Chicureo, finanzas y stock sin recordar IDs.",
      semanticTags: tokenizeQuery("busqueda semantica intencion chicureo problemas finanzas"),
      intentHints: ["chicureo", "finance_flow", "problem"],
    }
  );

  return out;
}

let cachedCorpus: SearchDocument[] | null = null;

export function getSearchCorpus(): SearchDocument[] {
  if (!cachedCorpus) cachedCorpus = buildSearchCorpus();
  return cachedCorpus;
}

function scoreDocument(
  doc: SearchDocument,
  queryIntents: Set<SemanticIntentId>,
  expandedTerms: Set<string>,
  rawQuery: string
): { score: number; matched: SemanticIntentId[]; reason: string } {
  const matched: SemanticIntentId[] = [];
  let score = 0;
  const reasons: string[] = [];

  const qn = stripAccents(rawQuery.toLowerCase());
  const blob = stripAccents(
    `${doc.title} ${doc.snippet} ${doc.semanticTags.join(" ")}`.toLowerCase()
  );

  Array.from(queryIntents).forEach((intent) => {
    if (doc.intentHints.includes(intent)) {
      matched.push(intent);
      score += 18;
      reasons.push(`intención «${intent}»`);
    }
  });

  if (queryIntents.has("problem") && doc.riskSignals?.severity === "red") {
    score += 22;
    reasons.push("señal roja (alertas múltiples / crítico)");
  } else if (queryIntents.has("problem") && doc.riskSignals?.severity === "amber") {
    score += 12;
    reasons.push("riesgo ámbar");
  } else if (queryIntents.has("problem") && doc.riskSignals?.hasAlerts) {
    score += 10;
    reasons.push("con alertas");
  }

  if (queryIntents.has("chicureo") && doc.kind === "project") {
    if (blob.includes("chicureo")) {
      score += 14;
      reasons.push("proyecto Chicureo");
    }
  }

  let termHits = 0;
  expandedTerms.forEach((t) => {
    if (t.length < 2) return;
    if (blob.includes(t)) termHits++;
  });
  score += Math.min(24, termHits * 3);

  if (doc.semanticTags.some((tag) => qn.includes(tag))) {
    score += 8;
    reasons.push("tag semántico");
  }

  const loose = tokenizeQuery(rawQuery);
  for (const t of loose) {
    if (blob.includes(t)) score += 2;
  }

  return {
    score,
    matched: Array.from(new Set(matched)),
    reason: reasons.slice(0, 3).join(" · ") || "coincidencia léxica / semántica",
  };
}

export interface SemanticSearchOptions {
  /** Máximo de resultados (por relevancia). */
  limit?: number;
  /** Corpus explícito (tests). */
  corpus?: SearchDocument[];
}

/**
 * Búsqueda por significado: intenciones + expansión léxica + señales de riesgo en mocks.
 */
export function searchSemantic(query: string, options?: SemanticSearchOptions): SemanticSearchHit[] {
  const q = query.trim();
  if (!q) return [];

  const queryIntents = inferQueryIntents(q);
  const baseTerms = tokenizeQuery(q);
  const expandedTerms = expandTermsWithIntentSynonyms(baseTerms, queryIntents);

  const corpus = options?.corpus ?? getSearchCorpus();
  const limit = options?.limit ?? 20;

  const hits: SemanticSearchHit[] = corpus.map((doc) => {
    const { score, matched, reason } = scoreDocument(doc, queryIntents, expandedTerms, q);
    return {
      ...doc,
      relevanceScore: score,
      matchedIntents: matched,
      matchReason: reason,
    };
  });

  hits.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return hits.filter((h) => h.relevanceScore > 0).slice(0, limit);
}

/** Alias orientado a producto. */
export const semanticNeuralSearch = searchSemantic;
