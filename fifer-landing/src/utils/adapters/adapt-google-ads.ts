import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { GoogleAdsPayloadSchema } from "@/utils/adapters/schemas-zod";
import { buildZodDegradedNormalized, isRecord } from "@/utils/adapters/safe-fallback";

function coerceGoogleAdsPayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return {
      campaigns: payload.map((x, i) => {
        if (!isRecord(x)) {
          return { campaign_name: `Sin datos · ${i + 1}`, impressions: 0, clicks: 0 };
        }
        const name =
          typeof x.campaign_name === "string"
            ? x.campaign_name
            : typeof x.name === "string"
              ? x.name
              : `Campaña ${i + 1}`;
        return {
          campaign_id: typeof x.campaign_id === "string" ? x.campaign_id : undefined,
          campaign_name: name,
          impressions: typeof x.impressions === "number" ? x.impressions : 0,
          clicks: typeof x.clicks === "number" ? x.clicks : 0,
        };
      }),
    };
  }
  return payload;
}

const EMPTY_METRICS = { estado: "Sin datos", campaigns: 0 };

export function adaptGoogleAdsToBoxData(payload: unknown, title = "Google Ads"): FiferBoxDataNormalized {
  const coerced = coerceGoogleAdsPayload(payload);
  if (!isRecord(coerced)) {
    return {
      source: "google_ads",
      title,
      metrics: { ...EMPTY_METRICS },
      series: [],
      meta: { degraded: true, reason: "Respuesta Google Ads no es objeto" },
      raw: payload,
    };
  }
  const parsed = GoogleAdsPayloadSchema.safeParse(coerced);
  if (!parsed.success) {
    return buildZodDegradedNormalized("google_ads", title, parsed.error, payload);
  }
  const rows = parsed.data.campaigns ?? parsed.data.results ?? [];
  if (rows.length === 0) {
    return {
      source: "google_ads",
      title,
      metrics: { ...EMPTY_METRICS },
      series: [{ label: "Sin datos", value: 0 }],
      raw: payload,
    };
  }
  return {
    source: "google_ads",
    title,
    metrics: { campaigns: rows.length },
    series: rows.slice(0, 12).map((r, i) => ({
      label: (r.campaign_name ?? `Campaña ${i + 1}`).slice(0, 36),
      value: typeof r.clicks === "number" ? r.clicks : typeof r.impressions === "number" ? r.impressions : 0,
    })),
    raw: payload,
  };
}
