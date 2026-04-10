"use client";

import { useAiCreditOrchestratorStore } from "@/store/useAiCreditOrchestratorStore";
import { calculateCampaignBudget } from "@/lib/ai/credit-orchestrator";

export type { CampaignItem as CampaignItemType } from "@/lib/ai/credit-orchestrator";

/**
 * Punto de entrada único para Boxes: último presupuesto global y cálculo puro / persistido.
 */
export function useCampaignCredits() {
  const lastEstimate = useAiCreditOrchestratorStore((s) => s.lastEstimate);
  const lastItems = useAiCreditOrchestratorStore((s) => s.lastItems);
  const updatedAt = useAiCreditOrchestratorStore((s) => s.updatedAt);
  const setEstimateFromItems = useAiCreditOrchestratorStore((s) => s.setEstimateFromItems);
  const clearEstimate = useAiCreditOrchestratorStore((s) => s.clearEstimate);

  return {
    lastEstimate,
    lastItems,
    updatedAt,
    setEstimateFromItems,
    clearEstimate,
    calculateCampaignBudget,
  } as const;
}
