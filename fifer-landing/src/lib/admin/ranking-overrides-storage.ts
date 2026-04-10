/**
 * Ajustes editoriales de `taskSpecific` — persistencia local (vista previa admin).
 * La fuente de verdad del producto sigue siendo `engine-manifest.ts`; exportar JSON desde la UI para PR.
 */

export const FIFER_AI_RANKING_OVERRIDES_KEY = "fifer_ai_ranking_overrides_v1";

export type TaskRankingAdjustment = {
  engineId: string;
  taskKey: string;
  /** Suma al score publicado en manifiesto (p. ej. +0.3 si el modelo mejoró). */
  delta: number;
  updatedAt: number;
};

export type RankingOverridesPayload = {
  adjustments: TaskRankingAdjustment[];
};

export function loadRankingOverrides(): RankingOverridesPayload {
  if (typeof window === "undefined") return { adjustments: [] };
  try {
    const raw = localStorage.getItem(FIFER_AI_RANKING_OVERRIDES_KEY);
    if (!raw) return { adjustments: [] };
    const parsed = JSON.parse(raw) as RankingOverridesPayload;
    if (!parsed || !Array.isArray(parsed.adjustments)) return { adjustments: [] };
    return parsed;
  } catch {
    return { adjustments: [] };
  }
}

export function saveRankingOverrides(payload: RankingOverridesPayload): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FIFER_AI_RANKING_OVERRIDES_KEY, JSON.stringify(payload));
}

export function upsertAdjustment(
  prev: RankingOverridesPayload,
  next: Omit<TaskRankingAdjustment, "updatedAt">
): RankingOverridesPayload {
  const ts = Date.now();
  const without = prev.adjustments.filter(
    (a) => !(a.engineId === next.engineId && a.taskKey === next.taskKey)
  );
  return {
    adjustments: [...without, { ...next, updatedAt: ts }],
  };
}

/** Score efectivo para vista previa admin (base manifiesto + delta local). */
export function effectiveTaskScore(
  baseScore: number,
  engineId: string,
  taskKey: string,
  overrides: RankingOverridesPayload
): number {
  const hit = overrides.adjustments.find((a) => a.engineId === engineId && a.taskKey === taskKey);
  const delta = hit?.delta ?? 0;
  return Math.round((baseScore + delta) * 10) / 10;
}
