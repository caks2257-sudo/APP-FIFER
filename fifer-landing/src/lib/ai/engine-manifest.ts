/**
 * Catálogo de motores IA — reactivo: hidrata desde `fifer_ai_meta` (Supabase) vía
 * `refreshEngineCatalogFromDatabase` / sync-worker; fallback {@link ENGINE_MANIFEST_SEED}.
 */

export type { AiEngineUnitType, IAiEngine } from "@/lib/ai/ai-engine-types";
export { ENGINE_MANIFEST_SEED } from "@/lib/ai/engine-manifest-seed";

import type { IAiEngine } from "@/lib/ai/ai-engine-types";
import { ENGINE_MANIFEST_SEED } from "@/lib/ai/engine-manifest-seed";

let liveCatalog: IAiEngine[] | null = null;
let byId = new Map<string, IAiEngine>(ENGINE_MANIFEST_SEED.map((e) => [e.id, e]));

function rebuildIndex(engines: readonly IAiEngine[]) {
  byId = new Map(engines.map((e) => [e.id, e]));
}

/**
 * Sustituye el catálogo en memoria (p. ej. tras leer Supabase + telemetría).
 */
export function setEngineCatalog(engines: readonly IAiEngine[]): void {
  liveCatalog = engines.map((e) => ({ ...e, ranking: { ...e.ranking, taskSpecific: { ...e.ranking.taskSpecific } } }));
  rebuildIndex(liveCatalog);
}

export function resetEngineCatalogToSeed(): void {
  liveCatalog = null;
  rebuildIndex(ENGINE_MANIFEST_SEED);
}

/** Catálogo efectivo: DB si se hidrató; si no, semilla. */
export function getActiveEngines(): readonly IAiEngine[] {
  return liveCatalog ?? ENGINE_MANIFEST_SEED;
}

/**
 * @deprecated Usar `getActiveEngines()` o `listEngines()`. Mantener alias para compat.
 */
export function getAIEngineManifest(): readonly IAiEngine[] {
  return getActiveEngines();
}

function normalizeForMatch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenizeNormalized(s: string): string[] {
  return normalizeForMatch(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
}

export function scoreEngineForTask(engine: IAiEngine, task: string): number {
  const nt = normalizeForMatch(task);
  const taskTokens = new Set(tokenizeNormalized(task));
  let best = engine.ranking.general;

  for (const [rawKey, score] of Object.entries(engine.ranking.taskSpecific)) {
    const nk = normalizeForMatch(rawKey);
    if (!nk.length) continue;

    if (nt.includes(nk) || nk.includes(nt)) {
      best = Math.max(best, score);
      continue;
    }

    const keyTokens = tokenizeNormalized(rawKey);
    const overlap = keyTokens.some((t) => taskTokens.has(t) && t.length >= 4);
    if (overlap) {
      best = Math.max(best, score);
    }
  }

  return best;
}

export function getEngineById(id: string): IAiEngine | undefined {
  return byId.get(id);
}

export function listEngines(): readonly IAiEngine[] {
  return getActiveEngines();
}

function prettyTaskSpecificLabel(rawKey: string): string {
  return rawKey
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function explainEngineRankingForTask(
  engine: IAiEngine,
  task: string
): { displayScore: number; contextLabel: string } {
  const t = task.trim();
  const finalScore = scoreEngineForTask(engine, t);
  const displayScore = Math.round(finalScore * 10) / 10;

  if (!t.length) {
    return {
      displayScore: Math.round(engine.ranking.general * 10) / 10,
      contextLabel: "General",
    };
  }

  if (finalScore <= engine.ranking.general + 1e-9) {
    return { displayScore, contextLabel: "General" };
  }

  const nt = normalizeForMatch(t);
  const taskTokens = new Set(tokenizeNormalized(t));
  const achievers: string[] = [];

  for (const [rawKey, score] of Object.entries(engine.ranking.taskSpecific)) {
    if (Math.abs(score - finalScore) > 1e-6) continue;
    const nk = normalizeForMatch(rawKey);
    if (!nk.length) continue;
    let matched = false;
    if (nt.includes(nk) || nk.includes(nt)) {
      matched = true;
    } else {
      const keyTokens = tokenizeNormalized(rawKey);
      matched = keyTokens.some((k) => taskTokens.has(k) && k.length >= 4);
    }
    if (matched) achievers.push(rawKey);
  }

  if (!achievers.length) {
    return { displayScore, contextLabel: "General" };
  }

  achievers.sort((a, b) => a.localeCompare(b));
  return {
    displayScore,
    contextLabel: `Ideal para ${prettyTaskSpecificLabel(achievers[0])}`,
  };
}

export function getBestEngine(task: string): IAiEngine | null {
  const t = task.trim();
  if (!t.length) {
    return null;
  }

  const catalog = getActiveEngines();
  let best: IAiEngine | null = null;
  let bestScore = -Infinity;

  for (const engine of catalog) {
    const s = scoreEngineForTask(engine, t);
    if (s > bestScore) {
      bestScore = s;
      best = engine;
    } else if (s === bestScore && best !== null) {
      if (engine.ranking.general > best.ranking.general) {
        best = engine;
      } else if (engine.ranking.general === best.ranking.general && engine.id < best.id) {
        best = engine;
      }
    }
  }

  return best;
}

/**
 * Motor de respaldo con mejor score para la tarea, excluyendo uno dado (p. ej. motor Pro degradado).
 */
export function getBestFallbackEngine(task: string, excludeEngineId: string): IAiEngine | null {
  const t = task.trim();
  if (!t.length) return null;
  const catalog = getActiveEngines();
  let best: IAiEngine | null = null;
  let bestScore = -Infinity;
  for (const engine of catalog) {
    if (engine.id === excludeEngineId) continue;
    const s = scoreEngineForTask(engine, t);
    if (s > bestScore) {
      bestScore = s;
      best = engine;
    }
  }
  return best;
}
