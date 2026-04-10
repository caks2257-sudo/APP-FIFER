import type { BoxProps } from "@/types/fifer-box";
import { FIFER_DATA_CORRUPTION_MESSAGE, FiferDataValidationError } from "@/types/schemas";
import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import {
  adaptAiCapabilitiesToBoxData,
  adaptCampaignDraftsToBoxData,
  adaptPlatformRankingToBoxData,
} from "@/utils/adapters/adapt-ai";
import { adaptAiEngineManifestToBoxData, adaptEngineCatalogApiToBoxData } from "@/utils/adapters/adapt-engine-manifest";
import { adaptFinanceApiToBoxData } from "@/utils/adapters/adapt-finance";
import { adaptGoogleAdsToBoxData } from "@/utils/adapters/adapt-google-ads";
import { adaptMercadoLibreToBoxData } from "@/utils/adapters/adapt-mercadolibre";
import { adaptShopifyToBoxData } from "@/utils/adapters/adapt-shopify";
import { adaptUnknownApiToBoxData } from "@/utils/adapters/adapt-unknown";
import { toBoxPropsData } from "@/utils/adapters/to-box-props";

export type ToFiferBoxDataOptions = {
  boxId?: string;
};

export type ToFiferBoxDataResult = {
  data: BoxProps["data"];
  /**
   * Error de validación Zod crítica (`meta.ghostMode`): `BoxLoader` muestra Discovery manteniendo `data` seguro.
   */
  adapterError: Error | null;
};

/** `true` si el adaptador pidió Modo Sanación tras fallo de esquema. */
export function boxDataHasAdapterGhostMode(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const rec = data as Record<string, unknown>;
  const norm = rec.normalized;
  if (norm && typeof norm === "object") {
    const meta = (norm as { meta?: { ghostMode?: boolean } }).meta;
    if (meta?.ghostMode) return true;
  }
  const topMeta = rec.meta as { ghostMode?: boolean } | undefined;
  return Boolean(topMeta?.ghostMode);
}

/**
 * Enrutador API → `BoxProps["data"]` según `module` + `boxId` (bridge HTTP / `fifer-box-data-bridge`).
 * Para validación explícita con Zod sobre un payload, usar `toFiferBoxData` en `universal-adapter.ts`.
 */
export function routeApiResponseToFiferBoxData(
  rawResponse: unknown,
  module: string,
  options?: ToFiferBoxDataOptions
): ToFiferBoxDataResult {
  const mod = module.toLowerCase();
  const bid = (options?.boxId ?? "").toLowerCase();

  const normalized: FiferBoxDataNormalized = (() => {
    if (mod === "engines") {
      return adaptAiEngineManifestToBoxData(rawResponse);
    }
    if (mod === "engines-api") {
      return adaptEngineCatalogApiToBoxData(rawResponse);
    }
    if (bid.includes("google-shopping") || bid.includes("google-ads")) {
      return adaptGoogleAdsToBoxData(rawResponse, "Google Shopping / Ads");
    }
    if (mod === "finance" || bid.includes("finance")) {
      return adaptFinanceApiToBoxData(rawResponse);
    }
    if (mod === "shopify" || bid.includes("shopify")) {
      return adaptShopifyToBoxData(rawResponse);
    }
    if (mod === "mercadolibre" || bid.includes("mercadolibre") || bid.includes("meli")) {
      return adaptMercadoLibreToBoxData(rawResponse);
    }
    if (mod === "affiliates" || bid.includes("affiliate")) {
      return adaptPlatformRankingToBoxData(rawResponse);
    }
    if (bid.includes("ingestor") || bid.includes("feed")) {
      return adaptCampaignDraftsToBoxData(rawResponse);
    }
    if (mod === "content" || bid.includes("content")) {
      return adaptAiCapabilitiesToBoxData(rawResponse, "Capacidades IA · contenido");
    }
    return adaptUnknownApiToBoxData(rawResponse);
  })();

  const data = toBoxPropsData(normalized);
  const ghost = Boolean(normalized.meta?.ghostMode);
  return {
    data,
    adapterError: ghost ? new FiferDataValidationError(FIFER_DATA_CORRUPTION_MESSAGE) : null,
  };
}
