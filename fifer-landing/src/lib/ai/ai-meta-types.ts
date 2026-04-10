import type { AiEngineUnitType, IAiEngine } from "@/lib/ai/ai-engine-types";

export type FiferAiMetaRow = {
  engine_id: string;
  provider: string;
  name: string;
  description: string;
  specialty: string;
  cost_per_unit: number | string;
  unit_type: AiEngineUnitType;
  ranking_general: number | string;
  ranking_task_specific: Record<string, number> | null;
  context_window_tokens: number | null;
  provider_model_id: string | null;
  metadata: Record<string, unknown> | null;
  margin_volatility_bump: number | string | null;
  is_active: boolean;
  last_sync_source?: string | null;
};

export function metaRowToEngine(row: FiferAiMetaRow): IAiEngine {
  const ts = row.ranking_task_specific && typeof row.ranking_task_specific === "object"
    ? row.ranking_task_specific
    : {};
  return {
    id: row.engine_id,
    name: row.name,
    provider: row.provider,
    description: row.description ?? "",
    specialty: row.specialty ?? "",
    costPerUnit: Number(row.cost_per_unit),
    unitType: row.unit_type,
    ranking: {
      general: Number(row.ranking_general),
      taskSpecific: { ...ts },
    },
    contextWindowTokens: row.context_window_tokens ?? undefined,
  };
}

export function engineToMetaUpsert(engine: IAiEngine, extras?: Partial<FiferAiMetaRow>) {
  return {
    engine_id: engine.id,
    provider: engine.provider,
    name: engine.name,
    description: engine.description,
    specialty: engine.specialty,
    cost_per_unit: engine.costPerUnit,
    unit_type: engine.unitType,
    ranking_general: engine.ranking.general,
    ranking_task_specific: engine.ranking.taskSpecific,
    context_window_tokens: engine.contextWindowTokens ?? null,
    is_active: true,
    ...extras,
  };
}
