/**
 * Orquestador de créditos FIFER — presupuesto de campaña a partir del manifiesto de motores.
 *
 * - Coste base: `engine-manifest.ts` (`costPerUnit` × unidades facturables).
 * - Tokens: `quantity` = tokens crudos; `costPerUnit` se interpreta como **USD por bloque de 1K tokens**.
 * - Margen comercial FIFER y escala USD→créditos vía env (con defaults).
 * - **Admin-First Keys**: la política de facturación asume claves `FIFER_ADMIN_*` en runtime servidor;
 *   el cálculo de créditos no consume API keys; BYOK de usuario no modifica estos importes (por ahora).
 */

import type { IAiEngine } from "@/lib/ai/engine-manifest";
import {
  explainEngineRankingForTask,
  getEngineById,
  listEngines,
} from "@/lib/ai/engine-manifest";
import { createFiferServiceSupabase } from "@/lib/supabase-server";
import { getTelemetryVolatilityAddonPercent } from "@/lib/ai/telemetry";

/** Bloque de facturación para motores con `unitType: "tokens"`. */
export const TOKEN_BILLING_CHUNK = 1000;

export const DEFAULT_FIFER_MARGIN_PERCENT = 20;

/** Créditos FIFER por cada 1 USD de coste base (antes de margen). */
export const DEFAULT_CREDITS_PER_USD = 1000;

/** Prefijo de variables de entorno para claves administradas por FIFER (servidor). */
export const FIFER_ADMIN_ENV_PREFIX = "FIFER_ADMIN_";

export type CampaignItem = {
  /** `id` del motor en el catálogo activo (`fifer_ai_meta` / semilla). */
  engineId: string;
  /**
   * Cantidad en unidades del motor:
   * - `tokens`: número de tokens (se divide internamente por {@link TOKEN_BILLING_CHUNK})
   * - `images` | `seconds` | `characters`: unidades enteras según el manifiesto
   */
  quantity: number;
};

export type CampaignBudgetBreakdownLine = {
  engine: string;
  cost: number;
};

export type CampaignBudgetResult = {
  totalCredits: number;
  breakdown: CampaignBudgetBreakdownLine[];
};

export type FiferBillingPolicy = {
  /** Siempre `true`: se ignora BYOK de usuario para esta capa de pricing. */
  adminFirstKeys: true;
  marginPercent: number;
  creditsPerUsd: number;
};

const ADMIN_FIRST_HINT_SLOTS = [
  `${FIFER_ADMIN_ENV_PREFIX}OPENAI_API_KEY`,
  `${FIFER_ADMIN_ENV_PREFIX}ANTHROPIC_API_KEY`,
  `${FIFER_ADMIN_ENV_PREFIX}GOOGLE_API_KEY`,
] as const;

function parseEnvNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Margen FIFER (porcentaje). Cliente: `NEXT_PUBLIC_FIFER_CREDIT_MARGIN_PERCENT`.
 * Servidor: también `FIFER_CREDIT_MARGIN_PERCENT`.
 */
export function readFiferCreditMarginPercent(): number {
  const pub =
    typeof process !== "undefined" && process.env
      ? process.env.NEXT_PUBLIC_FIFER_CREDIT_MARGIN_PERCENT
      : undefined;
  const server =
    typeof process !== "undefined" && process.env
      ? process.env.FIFER_CREDIT_MARGIN_PERCENT
      : undefined;
  return parseEnvNumber(pub ?? server, DEFAULT_FIFER_MARGIN_PERCENT);
}

/**
 * Escala USD base → créditos (antes de margen).
 * Cliente: `NEXT_PUBLIC_FIFER_CREDITS_PER_USD`. Servidor: `FIFER_CREDITS_PER_USD`.
 */
export function readCreditsPerUsd(): number {
  const pub =
    typeof process !== "undefined" && process.env
      ? process.env.NEXT_PUBLIC_FIFER_CREDITS_PER_USD
      : undefined;
  const server =
    typeof process !== "undefined" && process.env
      ? process.env.FIFER_CREDITS_PER_USD
      : undefined;
  return parseEnvNumber(pub ?? server, DEFAULT_CREDITS_PER_USD);
}

/**
 * Política de facturación alineada con Admin-First (sin lectura de secretos en cliente).
 */
export function resolveBillingPolicy(): FiferBillingPolicy {
  return {
    adminFirstKeys: true,
    marginPercent: readFiferCreditMarginPercent(),
    creditsPerUsd: readCreditsPerUsd(),
  };
}

/**
 * Indica qué slots `FIFER_ADMIN_*` están definidos (solo en Node; en navegador devuelve lista vacía).
 */
export function getAdminFirstKeyCoverage(): {
  mode: "admin-first";
  configuredSlots: string[];
} {
  if (typeof window !== "undefined") {
    return { mode: "admin-first", configuredSlots: [] };
  }
  const configuredSlots = ADMIN_FIRST_HINT_SLOTS.filter((name) => {
    const v = process.env[name];
    return typeof v === "string" && v.trim().length > 0;
  });
  return { mode: "admin-first", configuredSlots: [...configuredSlots] };
}

function billableUnits(engine: IAiEngine, quantity: number): number {
  if (engine.unitType === "tokens") {
    return quantity / TOKEN_BILLING_CHUNK;
  }
  return quantity;
}

function baseUsdForLine(engine: IAiEngine, quantity: number): number {
  return billableUnits(engine, quantity) * engine.costPerUnit;
}

function creditsForLine(
  engine: IAiEngine,
  quantity: number,
  marginPercent: number,
  creditsPerUsd: number
): number {
  const base = baseUsdForLine(engine, quantity);
  const preMargin = base * creditsPerUsd;
  const withMargin = preMargin * (1 + marginPercent / 100);
  return Math.max(0, Math.ceil(withMargin));
}

export type CalculateCampaignBudgetOptions = Partial<
  Pick<FiferBillingPolicy, "marginPercent" | "creditsPerUsd">
>;

/**
 * Margen efectivo (%) por motor: admin (`fifer_ai_admin_settings`) + bump en meta + volatilidad telemetría.
 * Solo servidor con service role obtiene DB; en cliente cae a env + telemetría en memoria si existiera.
 */
export async function getDynamicMargin(engineId: string): Promise<number> {
  const base = readFiferCreditMarginPercent();
  const sb = createFiferServiceSupabase();
  let adminBase = base;
  let sensitivity = 1;

  if (sb) {
    const { data: admin } = await sb
      .schema("fifer_platform")
      .from("fifer_ai_admin_settings")
      .select("base_margin_percent, volatility_sensitivity")
      .eq("id", "default")
      .maybeSingle();
    if (admin) {
      adminBase = Number(admin.base_margin_percent);
      sensitivity = Number(admin.volatility_sensitivity) || 1;
    }
    const { data: meta } = await sb
      .schema("fifer_platform")
      .from("fifer_ai_meta")
      .select("margin_volatility_bump")
      .eq("engine_id", engineId)
      .maybeSingle();
    const bump = meta ? Number(meta.margin_volatility_bump) : 0;
    const vol = await getTelemetryVolatilityAddonPercent(sb, engineId);
    return Math.max(0, Math.min(120, adminBase + bump + vol * sensitivity));
  }

  const vol = await getTelemetryVolatilityAddonPercent(null, engineId);
  return Math.max(0, Math.min(120, adminBase + vol * sensitivity));
}

/**
 * Presupuesto con `getDynamicMargin` por línea (servidor / API).
 */
export async function calculateCampaignBudgetWithDynamicMargin(
  items: CampaignItem[]
): Promise<CampaignBudgetResult> {
  const creditsPerUsd = readCreditsPerUsd();
  const breakdown: CampaignBudgetBreakdownLine[] = [];

  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity < 0) {
      throw new Error(`[credit-orchestrator] Cantidad inválida para engineId "${item.engineId}"`);
    }
    const engine = getEngineById(item.engineId);
    if (!engine) {
      throw new Error(`[credit-orchestrator] Motor desconocido: "${item.engineId}"`);
    }
    const marginPercent = await getDynamicMargin(item.engineId);
    const cost = creditsForLine(engine, item.quantity, marginPercent, creditsPerUsd);
    breakdown.push({ engine: engine.name, cost });
  }

  const totalCredits = breakdown.reduce((acc, line) => acc + line.cost, 0);
  return { totalCredits, breakdown };
}

/**
 * Calcula el presupuesto en Créditos FIFER para una lista de ítems de campaña.
 */
export function calculateCampaignBudget(
  items: CampaignItem[],
  options?: CalculateCampaignBudgetOptions
): CampaignBudgetResult {
  const policy = resolveBillingPolicy();
  const marginPercent = options?.marginPercent ?? policy.marginPercent;
  const creditsPerUsd = options?.creditsPerUsd ?? policy.creditsPerUsd;

  const breakdown: CampaignBudgetBreakdownLine[] = [];

  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity < 0) {
      throw new Error(`[credit-orchestrator] Cantidad inválida para engineId "${item.engineId}"`);
    }
    const engine = getEngineById(item.engineId);
    if (!engine) {
      throw new Error(`[credit-orchestrator] Motor desconocido: "${item.engineId}"`);
    }
    const cost = creditsForLine(engine, item.quantity, marginPercent, creditsPerUsd);
    breakdown.push({ engine: engine.name, cost });
  }

  const totalCredits = breakdown.reduce((acc, line) => acc + line.cost, 0);
  return { totalCredits, breakdown };
}

/** VM para UI de refinamiento — sin lógica de presentación en el Box; solo datos ya resueltos. */
export type RefiningMotorCandidateVm = {
  engineId: string;
  name: string;
  displayScore: number;
  contextLabel: string;
  /** Créditos FIFER estimados para este motor con la unidad por defecto del orquestador. */
  estimatedCredits: number;
};

export type RefiningMotorComparisonVm = {
  candidates: RefiningMotorCandidateVm[];
  /** Motor sugerido (primer candidato): créditos de referencia para la campaña tipo. */
  primaryEstimatedCredits: number;
};

/** Unidad de referencia para estimaciones (admin / comparativas). */
export function getDefaultQuantityForEngineEstimate(engine: IAiEngine): number {
  switch (engine.unitType) {
    case "tokens":
      return 2000;
    case "images":
      return 1;
    case "seconds":
      return 5;
    case "characters":
      return 500;
    default:
      return 1;
  }
}

function compareRefiningCandidates(
  a: { engine: IAiEngine; displayScore: number },
  b: { engine: IAiEngine; displayScore: number }
): number {
  if (b.displayScore !== a.displayScore) return b.displayScore - a.displayScore;
  if (b.engine.ranking.general !== a.engine.ranking.general) {
    return b.engine.ranking.general - a.engine.ranking.general;
  }
  return a.engine.id.localeCompare(b.engine.id);
}

/**
 * Top motores para la tarea + coste estimado por candidato vía {@link calculateCampaignBudget}.
 * Usar desde el shell (p. ej. `BoxLoader`) y pasar el VM al componente de chat de refinamiento.
 */
export function buildRefiningMotorComparison(input: {
  task: string;
  /** Máximo de filas en la comparativa (por defecto 2). */
  limit?: number;
}): RefiningMotorComparisonVm {
  const limit = input.limit ?? 2;
  const engines = [...listEngines()];
  const t = input.task.trim();

  const scored = engines.map((engine) => {
    const { displayScore, contextLabel } = explainEngineRankingForTask(engine, t);
    return { engine, displayScore, contextLabel };
  });

  scored.sort(compareRefiningCandidates);
  const first = scored[0];
  let top = scored.slice(0, Math.max(0, limit));
  if (first && limit >= 2) {
    const sameModalityIdx = scored.findIndex(
      (row, i) => i > 0 && row.engine.unitType === first.engine.unitType
    );
    const runner =
      sameModalityIdx >= 0 ? scored[sameModalityIdx] : scored.length > 1 ? scored[1] : undefined;
    top = runner ? [first, runner] : [first];
  }

  const candidates: RefiningMotorCandidateVm[] = top.map(({ engine, displayScore, contextLabel }) => {
    const qty = getDefaultQuantityForEngineEstimate(engine);
    const { totalCredits } = calculateCampaignBudget([{ engineId: engine.id, quantity: qty }]);
    return {
      engineId: engine.id,
      name: engine.name,
      displayScore,
      contextLabel,
      estimatedCredits: totalCredits,
    };
  });

  const primaryEstimatedCredits = candidates[0]?.estimatedCredits ?? 0;
  return { candidates, primaryEstimatedCredits };
}
