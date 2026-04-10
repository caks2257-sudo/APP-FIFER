import type { FiferBoxDataNormalized, FiferBoxDataMeta } from "@/utils/adapters/types";
import type { z } from "zod";
import { zodIssuesToStrings } from "@/utils/adapters/schemas-zod";

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Objeto mínimo que nunca rompe un Box v0 genérico. */
export function emptySafeNormalized(
  source: FiferBoxDataNormalized["source"],
  title: string,
  meta?: FiferBoxDataMeta
): FiferBoxDataNormalized {
  return {
    source,
    title,
    metrics: {},
    series: [],
    canonicalRecords: [],
    meta: { degraded: true, reason: "Sin datos", ...meta },
  };
}

export function buildDegradedNormalized(
  source: FiferBoxDataNormalized["source"],
  title: string,
  reason: string,
  extras?: Partial<FiferBoxDataNormalized>
): FiferBoxDataNormalized {
  const { meta: em, metrics: emetrics, series, canonicalRecords, discoveryTrace, raw } = extras ?? {};
  const out: FiferBoxDataNormalized = {
    source,
    title,
    metrics: {
      ...(emetrics ?? {}),
      _degraded: 1,
      _reason: reason.slice(0, 200),
    },
    meta: { degraded: true, reason, ...em },
  };
  if (series !== undefined) out.series = series;
  if (canonicalRecords !== undefined) out.canonicalRecords = canonicalRecords;
  if (discoveryTrace !== undefined) out.discoveryTrace = discoveryTrace;
  if (raw !== undefined) out.raw = raw;
  return out;
}

export function buildZodDegradedNormalized(
  source: FiferBoxDataNormalized["source"],
  title: string,
  err: z.ZodError,
  raw?: unknown
): FiferBoxDataNormalized {
  return buildDegradedNormalized(source, title, "Esquema API no coincide con lo esperado", {
    raw,
    meta: {
      validationErrors: zodIssuesToStrings(err),
      /** Señal para `BoxLoader` / `useFiferData`: Discovery (Modo Sanación) sin crash blanco. */
      ghostMode: true,
    },
  });
}
