import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { MercadoLibrePayloadSchema } from "@/utils/adapters/schemas-zod";
import { buildZodDegradedNormalized, isRecord } from "@/utils/adapters/safe-fallback";

/** Normaliza búsqueda / listados MercadoLibre → filas canónicas seguras. */
export function adaptMercadoLibreToBoxData(payload: unknown): FiferBoxDataNormalized {
  if (!isRecord(payload)) {
    return {
      source: "mercadolibre",
      title: "MercadoLibre",
      metrics: { _degraded: 1 },
      meta: { degraded: true, reason: "Respuesta no es objeto" },
      raw: payload,
    };
  }
  const parsed = MercadoLibrePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return buildZodDegradedNormalized("mercadolibre", "MercadoLibre", parsed.error, payload);
  }
  const p = parsed.data;
  const results = p.results ?? [];
  const canonicalRecords: NonNullable<FiferBoxDataNormalized["canonicalRecords"]> = results
    .slice(0, 20)
    .map((it) => ({
      id: it.id ?? "",
      title: it.title ?? "",
      value: typeof it.price === "number" ? it.price : 0,
      currency: it.currency_id ?? "",
    }));
  const series = results.slice(0, 8).map((it, i) => ({
    label: (it.title ?? `Ítem ${i + 1}`).slice(0, 28),
    value: typeof it.price === "number" ? it.price : 0,
  }));
  return {
    source: "mercadolibre",
    title: p.query ? `ML · ${p.query}` : "MercadoLibre",
    series,
    metrics: {
      total: p.paging?.total ?? results.length,
    },
    canonicalRecords,
    raw: payload,
  };
}
