export type {
  BoxDataInput,
  DiscoveryFieldTrace,
  FiferBoxDataMeta,
  FiferBoxDataNormalized,
  FiferCanonicalFieldKey,
} from "@/utils/adapters/types";

export { adaptFinanceApiToBoxData } from "@/utils/adapters/adapt-finance";
export { adaptShopifyToBoxData } from "@/utils/adapters/adapt-shopify";
export { adaptMercadoLibreToBoxData } from "@/utils/adapters/adapt-mercadolibre";
export { adaptAffiliatesToBoxData } from "@/utils/adapters/adapt-affiliates";
export {
  adaptAiCapabilitiesToBoxData,
  adaptCampaignDraftsToBoxData,
  adaptPlatformRankingToBoxData,
} from "@/utils/adapters/adapt-ai";
export { adaptUnknownApiToBoxData } from "@/utils/adapters/adapt-unknown";
export type { AdapterHint } from "@/utils/adapters/adapt-unknown";
export { toBoxPropsData } from "@/utils/adapters/to-box-props";

export {
  emptySafeNormalized,
  buildDegradedNormalized,
  buildZodDegradedNormalized,
  isRecord,
} from "@/utils/adapters/safe-fallback";

export { adaptGoogleAdsToBoxData } from "@/utils/adapters/adapt-google-ads";
export {
  adaptAiEngineManifestToBoxData,
  adaptEngineCatalogApiToBoxData,
} from "@/utils/adapters/adapt-engine-manifest";
export {
  routeApiResponseToFiferBoxData,
  boxDataHasAdapterGhostMode,
} from "@/utils/adapters/to-fifer-box-data";

export {
  adaptScraperEngineToBoxProps,
  adaptContentEngineToBoxProps,
  adaptEngineResultToBoxProps,
} from "@/utils/adapters/engine-bridge";
export type { ToFiferBoxDataOptions, ToFiferBoxDataResult } from "@/utils/adapters/to-fifer-box-data";

/** Aduana Zod — `toFiferBoxData(raw, schema)` (Capa 5). */
export {
  toFiferBoxData as toFiferBoxDataSchema,
  type SafeFallbackData,
  type ToFiferBoxDataSchemaOptions,
  type ToFiferBoxDataSchemaResult,
  type ToFiferBoxDataSchemaSuccess,
  type ToFiferBoxDataSchemaFailure,
} from "@/utils/adapters/universal-adapter";
