import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { FinanceApiPayloadSchema } from "@/utils/adapters/schemas-zod";
import { buildZodDegradedNormalized, isRecord } from "@/utils/adapters/safe-fallback";

export function adaptFinanceApiToBoxData(payload: unknown): FiferBoxDataNormalized {
  if (!isRecord(payload)) {
    return {
      source: "finance",
      title: "Finanzas",
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: "Respuesta no es objeto" },
      raw: payload,
    };
  }
  const parsed = FinanceApiPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return buildZodDegradedNormalized("finance", "Finanzas", parsed.error, payload);
  }
  const p = parsed.data;
  const total =
    (typeof p.total === "number" ? p.total : undefined) ??
    (typeof p.balance === "number" ? p.balance : undefined) ??
    (typeof p.available_balance === "number" ? p.available_balance : undefined);
  const metrics: Record<string, string | number> = {};
  if (total !== undefined) metrics.total = total;
  if (typeof p.currency === "string") metrics.currency = p.currency;
  return {
    source: "finance",
    title: typeof p.title === "string" ? p.title : "Resumen financiero",
    metrics,
    raw: payload,
  };
}
