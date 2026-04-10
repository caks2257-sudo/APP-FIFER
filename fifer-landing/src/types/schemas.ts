import { z } from "zod";
import type { ZodError } from "zod";
import type { BoxProps } from "@/types/fifer-box";

/** Mensaje unificado para autosanación / Discovery cuando Zod falla. */
export const FIFER_DATA_CORRUPTION_MESSAGE =
  "Datos corruptos detectados, intentando reparar estructura...";

export class FiferDataValidationError extends Error {
  override name = "FiferDataValidationError";
  constructor(message: string = FIFER_DATA_CORRUPTION_MESSAGE) {
    super(message);
  }
}

/**
 * Fallo de validación Zod en el adaptador universal (`toFiferBoxData` + schema).
 * Capturable por ErrorBoundary cuando `throwOnInvalid` está activo.
 */
export class FiferDataError extends Error {
  override name = "FiferDataError";
  constructor(
    message: string,
    public readonly zodError?: ZodError
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Payload crudo Chicureo / finanzas (`financeMockData`). */
export const FinanceDataSchema = z
  .object({
    summary: z
      .object({
        totalUF: z.number(),
        pendingUF: z.number(),
        activeProjects: z.number(),
      })
      .optional(),
    projects: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          location: z.string(),
          status: z.string(),
          progress: z.number(),
          fee: z.string(),
          alerts: z.array(z.string()),
        })
      )
      .optional(),
    cashflowChart: z
      .array(
        z.object({
          month: z.string(),
          income: z.number(),
          expenses: z.number(),
        })
      )
      .optional(),
    view: z.string().optional(),
  })
  .passthrough();

/** ABKupfer / pipeline editorial (`contentMockData`). */
export const ContentDataSchema = z
  .object({
    brand: z.string(),
    inventory: z.array(
      z.object({
        name: z.string(),
        stock: z.string(),
        price: z.string(),
        trend: z.string(),
      })
    ),
    campaigns: z.array(
      z.object({
        title: z.string(),
        platform: z.string(),
        status: z.string(),
        assets: z.array(z.string()),
        reachEstimate: z.string(),
      })
    ),
  })
  .passthrough();

/** Red de afiliados (`AffiliateMockRaw`). */
export const AffiliateDataSchema = z
  .object({
    networks: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum(["healthy", "degraded", "offline"]),
        lastSyncMs: z.number(),
        activePublishers: z.number(),
      })
    ),
    commissionLines: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        orderRef: z.string(),
        materialFamily: z.string(),
        saleAmountClp: z.number(),
        commissionRatePct: z.number(),
        commissionClp: z.number(),
        state: z.enum(["pending", "approved", "paid"]),
      })
    ),
    view: z.string().optional(),
  })
  .passthrough();

const FiferBoxDataMetaSchema = z
  .object({
    degraded: z.boolean().optional(),
    reason: z.string().optional(),
    validationErrors: z.array(z.string()).optional(),
    sourceHint: z.string().optional(),
    ghostMode: z.boolean().optional(),
  })
  .optional();

/** Capa normalizada mínima (`FiferBoxDataNormalized`). */
export const FiferBoxNormalizedEnvelopeSchema = z.object({
  source: z.enum(["finance", "shopify", "affiliates", "generic", "mercadolibre", "ai", "google_ads"]),
  title: z.string().optional(),
  series: z.array(z.object({ label: z.string(), value: z.number() })).optional(),
  metrics: z.record(z.union([z.string(), z.number()])).optional(),
  canonicalRecords: z.array(z.record(z.unknown())).optional(),
  discoveryTrace: z
    .array(
      z.object({
        sourceKey: z.string(),
        canonical: z.string(),
        score: z.number(),
      })
    )
    .optional(),
  raw: z.unknown().optional(),
  meta: FiferBoxDataMetaSchema,
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractNormalizedBlob(data: unknown): Record<string, unknown> | null {
  if (!isRecord(data)) return null;
  if (isRecord(data.normalized)) return data.normalized;
  if (typeof data.source === "string") return data;
  return null;
}

export function isEmptyBoxPayload(data: unknown): boolean {
  if (data == null) return true;
  if (typeof data === "object" && !Array.isArray(data) && Object.keys(data as object).length === 0) return true;
  return false;
}

function looksLikeFinanceMockRaw(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  const s = raw.summary;
  if (isRecord(s) && typeof s.totalUF === "number") return true;
  if (Array.isArray(raw.cashflowChart) && raw.cashflowChart.length > 0) return true;
  return false;
}

function looksLikeContentMockRaw(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  return typeof raw.brand === "string" && Array.isArray(raw.inventory);
}

function looksLikeAffiliateMockRaw(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  return Array.isArray(raw.networks) || Array.isArray(raw.commissionLines);
}

/**
 * Valida `BoxProps.data` (sobre `normalized`) y `raw` cuando coincide con mocks conocidos.
 * Datos reales de API con formas distintas solo pasan validación de sobre.
 */
export function validateFiferBoxData(
  moduleId: string,
  data: unknown
): { ok: true; data: BoxProps["data"] } | { ok: false; error: FiferDataValidationError } {
  if (isEmptyBoxPayload(data)) {
    return { ok: true, data: data as BoxProps["data"] };
  }

  const blob = extractNormalizedBlob(data);
  if (!blob) {
    return { ok: false, error: new FiferDataValidationError() };
  }

  const env = FiferBoxNormalizedEnvelopeSchema.safeParse(blob);
  if (!env.success) {
    return { ok: false, error: new FiferDataValidationError() };
  }

  const raw = env.data.raw;
  const mod = moduleId.toLowerCase();
  const src = env.data.source;

  if (raw !== undefined && raw !== null) {
    if ((mod === "finance" || src === "finance") && looksLikeFinanceMockRaw(raw)) {
      const r = FinanceDataSchema.safeParse(raw);
      if (!r.success) return { ok: false, error: new FiferDataValidationError() };
    } else if (mod === "content" && looksLikeContentMockRaw(raw)) {
      const r = ContentDataSchema.safeParse(raw);
      if (!r.success) return { ok: false, error: new FiferDataValidationError() };
    } else if (
      (mod === "affiliates" || mod === "ingestor" || src === "affiliates") &&
      looksLikeAffiliateMockRaw(raw)
    ) {
      const r = AffiliateDataSchema.safeParse(raw);
      if (!r.success) return { ok: false, error: new FiferDataValidationError() };
    }
  }

  return { ok: true, data: data as BoxProps["data"] };
}
