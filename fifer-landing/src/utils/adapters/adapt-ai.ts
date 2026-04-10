import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import {
  AiCapabilitiesPayloadSchema,
  CampaignDraftsPayloadSchema,
  PlatformRankingPayloadSchema,
} from "@/utils/adapters/schemas-zod";
import { buildZodDegradedNormalized, isRecord } from "@/utils/adapters/safe-fallback";

/** API master devuelve `AiCapabilityRow[]`; el esquema Zod espera objeto con `models`. */
function coerceAiCapabilitiesPayload(payload: unknown): unknown {
  if (!Array.isArray(payload)) return payload;
  return {
    models: payload.map((row, i) => {
      if (!isRecord(row)) return { id: `row-${i}`, name: "Sin datos", provider: "" };
      return {
        id: typeof row.id === "string" ? row.id : String(row.id ?? i),
        name: typeof row.name === "string" ? row.name : "Sin datos",
        provider: typeof row.provider === "string" ? row.provider : undefined,
        modality: typeof row.capability_type === "string" ? row.capability_type : undefined,
      };
    }),
  };
}

function modelsToMetrics(models: { id?: string; name?: string; provider?: string }[] | undefined) {
  const metrics: Record<string, string | number> = { modelCount: models?.length ?? 0 };
  const first = models?.[0];
  if (first?.name) metrics.topModel = first.name;
  if (first?.provider) metrics.topProvider = first.provider;
  return metrics;
}

/** Capacidades / catálogo IA desde API master u homólogos. */
export function adaptAiCapabilitiesToBoxData(payload: unknown, title = "Capacidades IA"): FiferBoxDataNormalized {
  const shaped = coerceAiCapabilitiesPayload(payload);
  if (!isRecord(shaped)) {
    return {
      source: "ai",
      title,
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: "Respuesta IA no es objeto" },
      raw: payload,
    };
  }
  const parsed = AiCapabilitiesPayloadSchema.safeParse(shaped);
  if (!parsed.success) {
    return buildZodDegradedNormalized("ai", title, parsed.error, payload);
  }
  const p = parsed.data;
  return {
    source: "ai",
    title,
    metrics: modelsToMetrics(p.models),
    series: (p.models ?? []).slice(0, 10).map((m, i) => ({
      label: (m.name ?? m.id ?? `Modelo ${i + 1}`).slice(0, 32),
      value: 1,
    })),
    raw: payload,
  };
}

export function adaptCampaignDraftsToBoxData(payload: unknown): FiferBoxDataNormalized {
  if (!isRecord(payload)) {
    return {
      source: "generic",
      title: "Borradores",
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: "Borradores: respuesta inválida" },
      raw: payload,
    };
  }
  const parsed = CampaignDraftsPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return buildZodDegradedNormalized("generic", "Borradores de campaña", parsed.error, payload);
  }
  const p = parsed.data;
  const n = p.drafts?.length ?? p.total ?? 0;
  return {
    source: "generic",
    title: "Borradores de campaña",
    metrics: { drafts: n },
    raw: payload,
  };
}

export function adaptPlatformRankingToBoxData(payload: unknown): FiferBoxDataNormalized {
  if (!isRecord(payload)) {
    return {
      source: "generic",
      title: "Ranking",
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: "Ranking: respuesta inválida" },
      raw: payload,
    };
  }
  const parsed = PlatformRankingPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return buildZodDegradedNormalized("generic", "Ranking plataformas", parsed.error, payload);
  }
  const p = parsed.data;
  const rows = p.platforms ?? p.rankings ?? p.ranking ?? [];
  return {
    source: "generic",
    title: "Ranking plataformas",
    metrics: { entries: rows.length },
    series: rows.slice(0, 10).map((r, i) => {
      const row = r as Record<string, unknown>;
      const label =
        typeof row.display_name === "string"
          ? row.display_name
          : typeof row.platform_key === "string"
            ? row.platform_key
            : `Plataforma ${i + 1}`;
      const value = typeof row.total_usd === "number" ? row.total_usd : typeof row.rank === "number" ? row.rank : 0;
      return { label: String(label).slice(0, 32), value };
    }),
    raw: payload,
  };
}
