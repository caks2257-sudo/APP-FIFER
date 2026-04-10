import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { adaptAffiliatesToBoxData } from "@/utils/adapters/adapt-affiliates";
import {
  adaptAiCapabilitiesToBoxData,
  adaptCampaignDraftsToBoxData,
  adaptPlatformRankingToBoxData,
} from "@/utils/adapters/adapt-ai";
import { adaptFinanceApiToBoxData } from "@/utils/adapters/adapt-finance";
import { adaptMercadoLibreToBoxData } from "@/utils/adapters/adapt-mercadolibre";
import { adaptShopifyToBoxData } from "@/utils/adapters/adapt-shopify";
import { adaptGoogleAdsToBoxData } from "@/utils/adapters/adapt-google-ads";
import { emptySafeNormalized, isRecord } from "@/utils/adapters/safe-fallback";

export type AdapterHint =
  | "finance"
  | "shopify"
  | "affiliates"
  | "mercadolibre"
  | "ai"
  | "campaign-drafts"
  | "platform-ranking";

/**
 * Punto único de entrada heurística: detecta forma por `hint` o por forma del payload.
 * Si no reconoce nada, devuelve sobre vacío degradado (no rompe render).
 */
export function adaptUnknownApiToBoxData(payload: unknown, hint?: AdapterHint): FiferBoxDataNormalized {
  if (hint === "finance") return adaptFinanceApiToBoxData(payload);
  if (hint === "shopify") return adaptShopifyToBoxData(payload);
  if (hint === "affiliates") return adaptAffiliatesToBoxData(payload);
  if (hint === "mercadolibre") return adaptMercadoLibreToBoxData(payload);
  if (hint === "ai") return adaptAiCapabilitiesToBoxData(payload);
  if (hint === "campaign-drafts") return adaptCampaignDraftsToBoxData(payload);
  if (hint === "platform-ranking") return adaptPlatformRankingToBoxData(payload);

  if (isRecord(payload)) {
    if ("balance" in payload || "ledger" in payload || payload.source === "finance") {
      return adaptFinanceApiToBoxData(payload);
    }
    if ("orders" in payload && "shop_name" in payload) {
      return adaptShopifyToBoxData(payload);
    }
    if ("results" in payload && ("paging" in payload || "site_id" in payload)) {
      return adaptMercadoLibreToBoxData(payload);
    }
    if ("models" in payload || "capabilities" in payload) {
      return adaptAiCapabilitiesToBoxData(payload);
    }
    if ("commissions" in payload || "clicks" in payload) {
      return adaptAffiliatesToBoxData(payload);
    }
    if ("drafts" in payload) {
      return adaptCampaignDraftsToBoxData(payload);
    }
    if ("platforms" in payload || "rankings" in payload || "ranking" in payload) {
      return adaptPlatformRankingToBoxData(payload);
    }
    if ("campaigns" in payload || "customer_id" in payload) {
      return adaptGoogleAdsToBoxData(payload);
    }
  }

  return emptySafeNormalized("generic", "Datos", {
    reason: "Formato API no reconocido",
    sourceHint: "adaptUnknownApiToBoxData",
  });
}
