import type { BoxProps } from "@/types/fifer-box";

/** Claves canónicas que el Discovery Worker rellena desde APIs heterogéneas. */
export type FiferCanonicalFieldKey =
  | "title"
  | "label"
  | "name"
  | "value"
  | "amount"
  | "address"
  | "owner"
  | "status"
  | "currency"
  | "email"
  | "phone"
  | "date"
  | "id";

export interface DiscoveryFieldTrace {
  sourceKey: string;
  canonical: FiferCanonicalFieldKey;
  score: number;
}

/** Metadatos de resiliencia — el Shell puede mostrar estado degradado sin romper render. */
export interface FiferBoxDataMeta {
  degraded?: boolean;
  reason?: string;
  validationErrors?: string[];
  sourceHint?: string;
  /**
   * Fallo Zod / esquema crítico: el shell muestra `DiscoveryBox` aun existiendo `data` seguro
   * (`FiferDataValidationError` en `useFiferData`).
   */
  ghostMode?: boolean;
}

export interface FiferBoxDataNormalized {
  source: "finance" | "shopify" | "mercadolibre" | "affiliates" | "generic" | "ai" | "google_ads" | "scraper" | "content-engine";
  title?: string;
  series?: Array<{ label: string; value: number }>;
  metrics?: Record<string, string | number>;
  canonicalRecords?: Array<Partial<Record<FiferCanonicalFieldKey, string | number>>>;
  discoveryTrace?: DiscoveryFieldTrace[];
  /** Payload inspección — nunca obligatorio para render seguro. */
  raw?: unknown;
  meta?: FiferBoxDataMeta;
}

export type BoxDataInput = BoxProps["data"];
