import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { AffiliatesApiPayloadSchema } from "@/utils/adapters/schemas-zod";
import { buildZodDegradedNormalized, isRecord } from "@/utils/adapters/safe-fallback";

export function adaptAffiliatesToBoxData(payload: unknown): FiferBoxDataNormalized {
  if (!isRecord(payload)) {
    return {
      source: "affiliates",
      title: "Afiliados",
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: "Respuesta no es objeto" },
      raw: payload,
    };
  }
  const parsed = AffiliatesApiPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return buildZodDegradedNormalized("affiliates", "Afiliados", parsed.error, payload);
  }
  const p = parsed.data;
  const metrics: Record<string, string | number> = {};
  if (typeof p.clicks === "number") metrics.clicks = p.clicks;
  if (typeof p.commissions === "number") metrics.commissions = p.commissions;
  if (typeof p.conversionRate === "number") metrics.conversionRate = p.conversionRate;
  return {
    source: "affiliates",
    title: typeof p.campaignName === "string" ? p.campaignName : "Rendimiento",
    metrics,
    raw: payload,
  };
}
