import { z } from "zod";

import { EngineReportSchema } from "@/schemas/engine-report.schema";

/** Nivel de redundancia inferido del tamaño del clúster y solape I/O. */
export const RedundancyLevelSchema = z.enum(["none", "low", "medium", "high"]);
export type RedundancyLevel = z.infer<typeof RedundancyLevelSchema>;

/** Riesgo acumulado del clúster (peor caso + volumen). */
export const AccumulatedRiskSchema = z.enum(["low", "medium", "high", "critical"]);
export type AccumulatedRisk = z.infer<typeof AccumulatedRiskSchema>;

export const FusionSimilarityReasonSchema = z.enum(["inputs", "outputs", "keywords", "composite"]);
export type FusionSimilarityReason = z.infer<typeof FusionSimilarityReasonSchema>;

export const FusionMemberSchema = z.object({
  boxId: z.string().min(1),
  report: EngineReportSchema,
});
export type FusionMember = z.infer<typeof FusionMemberSchema>;

export const FusionComparisonSchema = z.object({
  /** Heurística 0–100: menor riesgo y menor complejidad I/O → mayor puntuación. */
  logicalEfficiencyScore: z.number().min(0).max(100),
  accumulatedRisk: AccumulatedRiskSchema,
  redundancyLevel: RedundancyLevelSchema,
  /** Texto legible para la UI (ej. mismo portal / mismos contratos). */
  redundancyNarrative: z.string().min(1),
  memberCount: z.number().int().min(1),
});
export type FusionComparison = z.infer<typeof FusionComparisonSchema>;

export const FusionOpportunitySchema = z.object({
  clusterId: z.string().min(1),
  primaryReason: FusionSimilarityReasonSchema,
  reasons: z.array(FusionSimilarityReasonSchema).min(1),
  members: z.array(FusionMemberSchema).min(2),
  comparison: FusionComparisonSchema,
});
export type FusionOpportunity = z.infer<typeof FusionOpportunitySchema>;

export const FusionAuditPayloadSchema = z.object({
  scannedAt: z.string().datetime(),
  engineCount: z.number().int().min(0),
  opportunities: z.array(FusionOpportunitySchema),
});
export type FusionAuditPayload = z.infer<typeof FusionAuditPayloadSchema>;
