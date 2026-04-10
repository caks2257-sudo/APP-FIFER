/**
 * Esquemas Zod para payloads externos — Shopify, MercadoLibre, IA, finanzas API.
 * `.passthrough()` conserva campos extra para `raw` sin invalidar el parse.
 */
import { z } from "zod";

export const FinanceApiPayloadSchema = z
  .object({
    title: z.string().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    available_balance: z.number().optional(),
    currency: z.string().optional(),
    ledger: z.unknown().optional(),
  })
  .passthrough();

export const ShopifyOrderRowSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    total_price: z.string().optional(),
    financial_status: z.string().optional(),
  })
  .passthrough();

export const ShopifyApiPayloadSchema = z
  .object({
    shop_name: z.string().optional(),
    order_count: z.number().optional(),
    orders: z.array(ShopifyOrderRowSchema).optional(),
  })
  .passthrough();

/** Listados / ítems típicos MercadoLibre (búsqueda, órdenes simplificadas). */
export const MercadoLibreItemSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    price: z.number().optional(),
    currency_id: z.string().optional(),
    sold_quantity: z.number().optional(),
  })
  .passthrough();

export const MercadoLibrePayloadSchema = z
  .object({
    results: z.array(MercadoLibreItemSchema).optional(),
    paging: z
      .object({
        total: z.number().optional(),
        offset: z.number().optional(),
        limit: z.number().optional(),
      })
      .optional(),
    site_id: z.string().optional(),
    query: z.string().optional(),
  })
  .passthrough();

export const AiCapabilityModelSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    provider: z.string().optional(),
    modality: z.string().optional(),
  })
  .passthrough();

export const AiCapabilitiesPayloadSchema = z
  .object({
    models: z.array(AiCapabilityModelSchema).optional(),
    capabilities: z.array(z.string()).optional(),
    default_model: z.string().optional(),
  })
  .passthrough();

export const CampaignDraftsPayloadSchema = z
  .object({
    drafts: z.array(z.record(z.unknown())).optional(),
    total: z.number().optional(),
  })
  .passthrough();

export const PlatformRankingPayloadSchema = z
  .object({
    platforms: z.array(z.record(z.unknown())).optional(),
    rankings: z.array(z.record(z.unknown())).optional(),
    /** API master `fetchPlatformProfitRanking` */
    ranking: z.array(z.record(z.unknown())).optional(),
    window_days: z.number().optional(),
    note: z.string().optional(),
  })
  .passthrough();

/** Google Ads / Shopping — métricas por campaña o fila genérica. */
export const GoogleAdsCampaignRowSchema = z
  .object({
    campaign_id: z.string().optional(),
    campaign_name: z.string().optional(),
    impressions: z.number().optional(),
    clicks: z.number().optional(),
    cost_micros: z.number().optional(),
    conversions: z.number().optional(),
  })
  .passthrough();

export const GoogleAdsPayloadSchema = z
  .object({
    campaigns: z.array(GoogleAdsCampaignRowSchema).optional(),
    results: z.array(GoogleAdsCampaignRowSchema).optional(),
    customer_id: z.string().optional(),
    resource_name: z.string().optional(),
  })
  .passthrough();

/** `IAiEngine` alineado a `engine-manifest-seed` / `ai-engine-types`. */
export const AiEngineManifestRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    provider: z.string(),
    description: z.string(),
    specialty: z.string(),
    costPerUnit: z.number(),
    unitType: z.enum(["tokens", "images", "seconds", "characters"]),
    ranking: z.object({
      general: z.number(),
      taskSpecific: z.record(z.number()),
    }),
    contextWindowTokens: z.number().optional(),
  })
  .passthrough();

export const AiEngineManifestPayloadSchema = z.union([
  z.array(AiEngineManifestRowSchema),
  z.object({ engines: z.array(AiEngineManifestRowSchema).optional() }).passthrough(),
]);

/** Respuesta ligera `/api/v1/master/engines` (`EngineItem`). */
export const EngineItemRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    estimated_cost_usd: z.number().optional(),
    vendor: z.string().optional(),
  })
  .passthrough();

export const EngineCatalogPayloadSchema = z.union([
  z.array(EngineItemRowSchema),
  z.object({ engines: z.array(EngineItemRowSchema).optional() }).passthrough(),
]);

export const AffiliatesApiPayloadSchema = z
  .object({
    clicks: z.number().optional(),
    commissions: z.number().optional(),
    conversionRate: z.number().optional(),
    campaignName: z.string().optional(),
  })
  .passthrough();

export function zodIssuesToStrings(err: z.ZodError): string[] {
  return err.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`);
}
