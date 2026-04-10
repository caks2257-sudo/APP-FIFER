/**
 * Snapshot demo para `/admin/ai-health` — costes vs créditos y popularidad por tenant.
 * Sustituir `demoMonthlyCalls` / splits por telemetría real cuando exista backend.
 */

import type { IAiEngine } from "@/lib/ai/engine-manifest";
import { listEngines } from "@/lib/ai/engine-manifest";
import {
  calculateCampaignBudget,
  getDefaultQuantityForEngineEstimate,
  readCreditsPerUsd,
  readFiferCreditMarginPercent,
  TOKEN_BILLING_CHUNK,
} from "@/lib/ai/credit-orchestrator";

export type AiHealthCostRow = {
  engineId: string;
  engineName: string;
  /** Coste proveedor (USD) — período demo mensual. */
  realApiCostUsd: number;
  /** Créditos FIFER facturados a usuarios (mismo período). */
  userCreditsConsumed: number;
  /** Equivalente USD del cobro en créditos (`créditos / creditsPerUsd`). */
  revenueUsdEquivalent: number;
  /** Ingreso equivalente − coste API. */
  marginUsd: number;
  demoCalls: number;
};

export type AiHealthPopularityRow = {
  engineId: string;
  engineName: string;
  totalCalls: number;
  /** % de llamadas atribuidas a cuentas / verticales ABKupfer (demo). */
  abkupferPct: number;
  /** % Chicureo y resto (demo). */
  chicureoPct: number;
};

export type AiHealthSnapshot = {
  costRows: AiHealthCostRow[];
  popularity: AiHealthPopularityRow[];
  creditsPerUsd: number;
  marginPercent: number;
  asOfIso: string;
};

function apiBaseUsd(engine: IAiEngine, quantity: number): number {
  if (engine.unitType === "tokens") {
    return (quantity / TOKEN_BILLING_CHUNK) * engine.costPerUnit;
  }
  return quantity * engine.costPerUnit;
}

function demoMonthlyCalls(engineId: string): number {
  let h = 0;
  for (let i = 0; i < engineId.length; i++) {
    h = (h * 31 + engineId.charCodeAt(i)) >>> 0;
  }
  return 400 + (h % 4200);
}

function demoAbkupferPct(engineId: string): number {
  let h = 2166136261;
  for (let i = 0; i < engineId.length; i++) {
    h = Math.imul(h ^ engineId.charCodeAt(i), 16777619);
  }
  return 32 + ((h >>> 0) % 48);
}

export function getAiHealthSnapshot(): AiHealthSnapshot {
  const engines = [...listEngines()];
  const creditsPerUsd = readCreditsPerUsd();
  const marginPercent = readFiferCreditMarginPercent();
  const asOfIso = new Date().toISOString();

  const costRows: AiHealthCostRow[] = engines.map((engine) => {
    const calls = demoMonthlyCalls(engine.id);
    const q = getDefaultQuantityForEngineEstimate(engine);
    const quantityPeriod = q * calls;
    const realApiCostUsd = apiBaseUsd(engine, quantityPeriod);
    const { totalCredits } = calculateCampaignBudget([{ engineId: engine.id, quantity: q }]);
    const userCreditsConsumed = totalCredits * calls;
    const revenueUsdEquivalent = userCreditsConsumed / creditsPerUsd;
    const marginUsd = revenueUsdEquivalent - realApiCostUsd;

    return {
      engineId: engine.id,
      engineName: engine.name,
      realApiCostUsd,
      userCreditsConsumed,
      revenueUsdEquivalent,
      marginUsd,
      demoCalls: calls,
    };
  });

  const popularity: AiHealthPopularityRow[] = costRows
    .map((row) => {
      const ab = demoAbkupferPct(row.engineId);
      return {
        engineId: row.engineId,
        engineName: row.engineName,
        totalCalls: row.demoCalls,
        abkupferPct: ab,
        chicureoPct: Math.max(0, Math.min(100, 100 - ab)),
      };
    })
    .sort((a, b) => b.totalCalls - a.totalCalls);

  return {
    costRows,
    popularity,
    creditsPerUsd,
    marginPercent,
    asOfIso,
  };
}
