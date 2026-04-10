import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import {
  AiEngineManifestPayloadSchema,
  EngineCatalogPayloadSchema,
} from "@/utils/adapters/schemas-zod";
import { buildZodDegradedNormalized, isRecord } from "@/utils/adapters/safe-fallback";

function normalizeEngineManifestInput(payload: unknown): unknown {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && Array.isArray(payload.engines)) return payload;
  return payload;
}

/** Catálogo alineado a `IAiEngine` (`engine-manifest.ts` / seed). */
export function adaptAiEngineManifestToBoxData(payload: unknown, title = "Motores IA"): FiferBoxDataNormalized {
  const input = normalizeEngineManifestInput(payload);
  const parsed = AiEngineManifestPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return buildZodDegradedNormalized("ai", title, parsed.error, payload);
  }
  const engines = Array.isArray(parsed.data) ? parsed.data : (parsed.data.engines ?? []);
  if (!engines.length) {
    return {
      source: "ai",
      title,
      metrics: { estado: "Sin datos", engines: 0 },
      series: [{ label: "Sin datos", value: 0 }],
      raw: payload,
    };
  }
  return {
    source: "ai",
    title,
    metrics: {
      engines: engines.length,
      topScore: engines[0]?.ranking?.general ?? 0,
    },
    series: engines.slice(0, 14).map((e, i) => ({
      label: `${e.name} (${e.provider})`.slice(0, 40),
      value: e.ranking?.general ?? i,
    })),
    raw: payload,
  };
}

/** Lista `/api/v1/master/engines` (`EngineItem`). */
export function adaptEngineCatalogApiToBoxData(payload: unknown, title = "Catálogo motores"): FiferBoxDataNormalized {
  const parsed = EngineCatalogPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return buildZodDegradedNormalized("ai", title, parsed.error, payload);
  }
  const list = Array.isArray(parsed.data) ? parsed.data : (parsed.data.engines ?? []);
  if (!list.length) {
    return {
      source: "ai",
      title,
      metrics: { estado: "Sin datos", engines: 0 },
      series: [{ label: "Sin datos", value: 0 }],
      raw: payload,
    };
  }
  return {
    source: "ai",
    title,
    metrics: { engines: list.length },
    series: list.slice(0, 14).map((e, i) => ({
      label: (e.name ?? e.id ?? `Motor ${i + 1}`).slice(0, 36),
      value: typeof e.estimated_cost_usd === "number" ? e.estimated_cost_usd : 1,
    })),
    raw: payload,
  };
}
