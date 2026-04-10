"use client";

import { create } from "zustand";
import {
  calculateCampaignBudget,
  type CampaignBudgetResult,
  type CampaignItem,
} from "@/lib/ai/credit-orchestrator";

export type AiCreditOrchestratorState = {
  lastEstimate: CampaignBudgetResult | null;
  lastItems: CampaignItem[] | null;
  updatedAt: number | null;
  setEstimateFromItems: (items: CampaignItem[]) => CampaignBudgetResult;
  clearEstimate: () => void;
};

/**
 * Estado global del presupuesto de campaña (Créditos FIFER) para consumo desde cualquier Fifer Box.
 */
export const useAiCreditOrchestratorStore = create<AiCreditOrchestratorState>((set) => ({
  lastEstimate: null,
  lastItems: null,
  updatedAt: null,

  setEstimateFromItems: (items) => {
    const result = calculateCampaignBudget(items);
    set({
      lastEstimate: result,
      lastItems: items,
      updatedAt: Date.now(),
    });
    return result;
  },

  clearEstimate: () =>
    set({
      lastEstimate: null,
      lastItems: null,
      updatedAt: null,
    }),
}));
