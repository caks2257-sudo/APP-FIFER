/**
 * Auditor de evolución — lee todos los `engine_report.json` del autodescubrimiento
 * y propone clústeres de fusión para el Core (`user-engine-discovery.ts`).
 */

import type { UserEngineReport } from "@/schemas/engine-report.schema";
import type {
  AccumulatedRisk,
  FusionComparison,
  FusionMember,
  FusionOpportunity,
  FusionSimilarityReason,
  RedundancyLevel,
} from "@/schemas/fusion-proposal.schema";
import { discoverUserEngineReports, type UserEngineDiscoveryResult } from "@/core/user-engine-discovery";

const STOP = new Set([
  "the",
  "and",
  "for",
  "con",
  "por",
  "para",
  "los",
  "las",
  "del",
  "una",
  "uno",
  "que",
  "from",
  "with",
]);

function inputSignature(r: UserEngineReport): string {
  return [...r.inputs.map((i) => i.id)].sort().join("\u001f");
}

function outputSignature(r: UserEngineReport): string {
  return [...r.outputs.map((o) => o.id)].sort().join("\u001f");
}

function tokenize(text: string): Set<string> {
  const parts = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 2 && !STOP.has(t));
  return new Set(parts);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  Array.from(a).forEach((x) => {
    if (b.has(x)) inter += 1;
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function keywordBag(r: UserEngineReport): Set<string> {
  return tokenize(`${r.id} ${r.name} ${r.function}`);
}

const KEYWORD_THRESHOLD = 0.28;

class UnionFind {
  private readonly parent = new Map<string, string>();

  constructor(keys: string[]) {
    for (const k of keys) this.parent.set(k, k);
  }

  find(x: string): string {
    let p = this.parent.get(x) ?? x;
    if (p !== x) {
      p = this.find(p);
      this.parent.set(x, p);
    }
    return p;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    this.parent.set(ra, rb);
  }
}

function riskRank(r: UserEngineReport["risk"]): number {
  switch (r) {
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    default:
      return 2;
  }
}

function maxRisk(a: UserEngineReport["risk"], b: UserEngineReport["risk"]): UserEngineReport["risk"] {
  return riskRank(a) >= riskRank(b) ? a : b;
}

function toAccumulatedRisk(
  worst: UserEngineReport["risk"],
  count: number
): AccumulatedRisk {
  if (worst === "high" && count >= 3) return "critical";
  if (worst === "high") return "high";
  if (worst === "medium" && count >= 3) return "high";
  if (worst === "medium") return "medium";
  return count >= 4 ? "medium" : "low";
}

function redundancyLevel(count: number, jaccardHint: number): RedundancyLevel {
  if (count >= 4 || (count >= 3 && jaccardHint >= KEYWORD_THRESHOLD)) return "high";
  if (count === 3) return "medium";
  if (count === 2) return "low";
  return "none";
}

function perEngineEfficiencyScore(r: UserEngineReport): number {
  const riskPenalty = r.risk === "low" ? 0 : r.risk === "medium" ? 18 : 38;
  const io = r.inputs.length + r.outputs.length;
  const ioPenalty = Math.min(28, io * 4);
  return Math.max(0, Math.min(100, 100 - riskPenalty - ioPenalty));
}

function buildComparison(
  members: FusionMember[],
  bags: Map<string, Set<string>>,
  primaryReason: FusionSimilarityReason
): FusionComparison {
  const count = members.length;
  let worst: UserEngineReport["risk"] = "low";
  for (const m of members) {
    worst = maxRisk(worst, m.report.risk);
  }
  const accumulatedRisk = toAccumulatedRisk(worst, count);

  let jMax = 0;
  const ids = members.map((m) => m.boxId);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const ji = jaccard(bags.get(ids[i]) ?? new Set(), bags.get(ids[j]) ?? new Set());
      if (ji > jMax) jMax = ji;
    }
  }

  const redundancy = redundancyLevel(count, jMax);
  const avgEff =
    members.reduce((s, m) => s + perEngineEfficiencyScore(m.report), 0) / Math.max(1, count);
  const clusterPenalty = Math.min(15, (count - 1) * 5);
  const logicalEfficiencyScore = Math.max(0, Math.min(100, Math.round(avgEff - clusterPenalty)));

  let redundancyNarrative: string;
  if (primaryReason === "inputs") {
    redundancyNarrative =
      count >= 3
        ? `${count} motores comparten el mismo contrato de entrada; probable duplicación de integraciones (p. ej. varios scrapers al mismo tipo de portal).`
        : "Dos motores exponen las mismas entradas; conviene unificar lógica y validación en un solo engine Core.";
  } else if (primaryReason === "outputs") {
    redundancyNarrative =
      count >= 3
        ? `${count} motores materializan las mismas salidas; riesgo de pipelines redundantes y drift de esquema.`
        : "Salidas alineadas entre motores: candidatos claros a consolidar en un único contrato normalizado.";
  } else {
    redundancyNarrative =
      jMax >= KEYWORD_THRESHOLD
        ? `Solape léxico fuerte entre nombres/funciones (Jaccard ~${jMax.toFixed(2)}); revisar si resuelven el mismo problema de negocio.`
        : "Motores relacionados por vocabulario o dominio; revisar si pueden fusionarse en un engine con variantes internas.";
  }

  return {
    logicalEfficiencyScore,
    accumulatedRisk,
    redundancyLevel: redundancy,
    redundancyNarrative,
    memberCount: count,
  };
}

function pickPrimaryReason(
  pairs: Array<{ a: string; b: string; reasons: FusionSimilarityReason[] }>
): FusionSimilarityReason {
  const rank: FusionSimilarityReason[] = ["inputs", "outputs", "keywords", "composite"];
  const counts = new Map<FusionSimilarityReason, number>();
  for (const r of rank) counts.set(r, 0);
  for (const p of pairs) {
    for (const r of p.reasons) {
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
  }
  let best: FusionSimilarityReason = "composite";
  let bestN = -1;
  for (const r of rank) {
    const n = counts.get(r) ?? 0;
    if (n > bestN) {
      bestN = n;
      best = r;
    }
  }
  return best;
}

/**
 * Agrupa engines por firma de `inputs`, `outputs` o similitud de palabras clave en `name` / `function` / `id`.
 */
export function detectFusionOpportunities(
  reports: Partial<Record<string, UserEngineReport>>
): FusionOpportunity[] {
  const entries = Object.entries(reports).filter(([, r]) => r != null) as [string, UserEngineReport][];
  if (entries.length < 2) return [];

  const boxIds = entries.map(([id]) => id);
  const uf = new UnionFind(boxIds);
  const pairReasons = new Map<string, FusionSimilarityReason[]>();

  const addPair = (a: string, b: string, reason: FusionSimilarityReason) => {
    uf.union(a, b);
    const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
    const cur = pairReasons.get(key) ?? [];
    if (!cur.includes(reason)) cur.push(reason);
    pairReasons.set(key, cur);
  };

  const byIn = new Map<string, string[]>();
  const byOut = new Map<string, string[]>();
  const bags = new Map<string, Set<string>>();

  for (const [boxId, report] of entries) {
    bags.set(boxId, keywordBag(report));
    const is = inputSignature(report);
    const os = outputSignature(report);
    if (!byIn.has(is)) byIn.set(is, []);
    byIn.get(is)!.push(boxId);
    if (!byOut.has(os)) byOut.set(os, []);
    byOut.get(os)!.push(boxId);
  }

  Array.from(byIn.values()).forEach((group) => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        addPair(group[i], group[j], "inputs");
      }
    }
  });
  Array.from(byOut.values()).forEach((group) => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        addPair(group[i], group[j], "outputs");
      }
    }
  });

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [a, ra] = entries[i];
      const [b, rb] = entries[j];
      if (jaccard(keywordBag(ra), keywordBag(rb)) >= KEYWORD_THRESHOLD) {
        addPair(a, b, "keywords");
      }
    }
  }

  const clusters = new Map<string, string[]>();
  for (const id of boxIds) {
    const root = uf.find(id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(id);
  }

  const opportunities: FusionOpportunity[] = [];
  let idx = 0;
  Array.from(clusters.values()).forEach((members) => {
    if (members.length < 2) return;
    const fusionMembers: FusionMember[] = members.map((boxId: string) => ({
      boxId,
      report: reports[boxId]!,
    }));

    const clusterPairs: Array<{ a: string; b: string; reasons: FusionSimilarityReason[] }> = [];
    const reasonSet = new Set<FusionSimilarityReason>();
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const x = members[i];
        const y = members[j];
        const key = x < y ? `${x}\u0000${y}` : `${y}\u0000${x}`;
        const pr = pairReasons.get(key) ?? [];
        if (pr.length) clusterPairs.push({ a: x, b: y, reasons: pr });
        for (const r of pr) reasonSet.add(r);
      }
    }

    let primary = pickPrimaryReason(clusterPairs);
    const reasons = Array.from(reasonSet);
    if (reasons.length === 0) {
      primary = "composite";
      reasons.push("composite");
    } else if (!reasons.includes(primary)) {
      primary = reasons[0];
    }

    const comparison = buildComparison(fusionMembers, bags, primary);
    idx += 1;
    opportunities.push({
      clusterId: `fusion-cluster-${idx}`,
      primaryReason: primary,
      reasons: reasons.length ? reasons : ["composite"],
      members: fusionMembers,
      comparison,
    });
  });

  opportunities.sort((a, b) => b.comparison.memberCount - a.comparison.memberCount);
  return opportunities;
}

export async function runEvolutionAudit(root?: string): Promise<{
  discovery: UserEngineDiscoveryResult;
  opportunities: FusionOpportunity[];
  scannedAt: string;
}> {
  const discovery = await discoverUserEngineReports(undefined, root);
  const opportunities = detectFusionOpportunities(discovery.reports);
  return {
    discovery,
    opportunities,
    scannedAt: new Date().toISOString(),
  };
}

export function buildFusionMasterPrompt(params: {
  targetSlug: string;
  memberSlugs: string[];
  reports: UserEngineReport[];
}): string {
  const { targetSlug, memberSlugs, reports } = params;
  const blocks = reports.map((r, i) => {
    const slug = memberSlugs[i] ?? r.id;
    return `### Motor fuente \`${slug}\`
- **Nombre:** ${r.name}
- **Función:** ${r.function}
- **Riesgo:** ${r.risk}
- **Versión:** ${r.version}
- **Inputs:** ${JSON.stringify(r.inputs)}
- **Outputs:** ${JSON.stringify(r.outputs)}
`;
  });

  return `# Master Prompt de Fusión — Core FIFER

**Objetivo:** Diseñar un único engine de registro Core bajo el slug propuesto \`${targetSlug}\`, fusionando las implementaciones del user_space listadas abajo.

## Contexto
- Los archivos fuente ya están consolidados en \`fifer-landing/src/registry/proposals/${targetSlug}/sources/<slug>/\`.
- Debes producir una implementación unificada: un solo \`engine_report.json\` coherente, \`execute\` estable, y tests o notas de verificación.
- Prioriza: seguridad (Vault/BYOK si aplica), contrato I/O estable, y eliminación de duplicación.

## Motores a fusionar
${blocks.join("\n")}

## Instrucciones para el agente (Cursor / Gemini)
1. Leer cada carpeta en \`sources/\` y catalogar solapamiento de lógica y riesgos.
2. Proponer **un** \`engine_report.json\` canónico (inputs/outputs mínimos pero suficientes).
3. Implementar \`index.ts\` (o entrypoint acordado) unificando rutas de error, tipos y normalización FIFER.
4. Ejecutar \`npm run fifer:discover-engines\` si el destino final sigue en user_space; si promueves a Core registry definitivo, seguir el checklist del repo.
5. Entregar diff resumido y criterios de aceptación (ROI/exactitud verificables vía DataWeaver en modo experimental).

---
_Generado por FIFER Evolution Auditor — ${new Date().toISOString()}_
`;
}
