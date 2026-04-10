/**
 * Barril de compatibilidad: los prompts y el código importan `@/utils/adapters`.
 *
 * - **Aduana universal (graceful degradation):** `toFiferBoxData(rawPayload, fallbackData)`.
 * - **Aduana Zod avanzada:** `toFiferBoxDataSchema(rawPayload, schema, options)` (`universal-adapter.ts`).
 * - **Bridge HTTP:** `routeApiResponseToFiferBoxData(raw, module, { boxId })` — enrutador por módulo (`to-fifer-box-data.ts`).
 * - **Universal Engines (`src/engines/`):** `adaptEngineResultToBoxProps(engineId, result)`, `adaptScraperEngineToBoxProps`, `adaptContentEngineToBoxProps` (`engine-bridge.ts`).
 */
import type { BoxProps } from "@/types/fifer-box";
import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { toBoxPropsData } from "@/utils/adapters/to-box-props";
import { adaptFinanceApiToBoxData } from "@/utils/adapters/adapt-finance";
import { adaptAiCapabilitiesToBoxData } from "@/utils/adapters/adapt-ai";
import { adaptAffiliatesToBoxData } from "@/utils/adapters/adapt-affiliates";

/**
 * Fase 3 — aduana mínima de payload.
 * Si el payload llega vacío o sin estructura base de objeto, evita crash de UI y devuelve `fallbackData`.
 */
export function toFiferBoxData(rawPayload: unknown, fallbackData: BoxProps["data"]): BoxProps["data"] {
  if (rawPayload === undefined || rawPayload === null) {
    console.warn("[FIFER][Adapter] payload vacío; usando fallbackData.");
    return fallbackData;
  }
  if (typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    console.warn("[FIFER][Adapter] payload sin estructura mínima de objeto; usando fallbackData.");
    return fallbackData;
  }
  const keys = Object.keys(rawPayload as Record<string, unknown>);
  if (keys.length === 0) {
    console.warn("[FIFER][Adapter] payload objeto vacío; usando fallbackData.");
    return fallbackData;
  }
  return rawPayload as BoxProps["data"];
}

/**
 * Adaptador explícito por dominio para el protocolo Shell.
 * Convierte payloads de Integrations Health (finance/content/affiliates) a `BoxProps.data`.
 */
export function adaptFinanceApiToBoxPropsData(payload: unknown): BoxProps["data"] {
  return toBoxPropsData(adaptFinanceApiToBoxData(payload));
}

export function adaptContentApiToBoxPropsData(payload: unknown): BoxProps["data"] {
  return toBoxPropsData(adaptAiCapabilitiesToBoxData(payload, "Contenido · Integraciones"));
}

export function adaptAffiliatesApiToBoxPropsData(payload: unknown): BoxProps["data"] {
  return toBoxPropsData(adaptAffiliatesToBoxData(payload));
}

export function adaptLogisticsApiToBoxPropsData(payload: unknown): BoxProps["data"] {
  const raw = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return toBoxPropsData({
    source: "generic",
    title: String(raw.title ?? "Logistics · Fleet"),
    metrics: {
      activeVehicles: Number(raw.activeVehicles ?? 0),
      delayedRoutes: Number(raw.delayedRoutes ?? 0),
      avgOnTimePct: Number(raw.avgOnTimePct ?? 0),
      incidentsOpen: Number(raw.incidentsOpen ?? 0),
    },
    raw: payload,
    meta: { sourceHint: "logistics-adapter" },
  } as FiferBoxDataNormalized);
}

export function adaptByModuleToBoxPropsData(moduleId: string, payload: unknown): BoxProps["data"] {
  const mod = moduleId.toLowerCase();
  if (mod === "finance") return adaptFinanceApiToBoxPropsData(payload);
  if (mod === "content") return adaptContentApiToBoxPropsData(payload);
  if (mod === "affiliates") return adaptAffiliatesApiToBoxPropsData(payload);
  if (mod === "logistics") return adaptLogisticsApiToBoxPropsData(payload);
  return toBoxPropsData({
    source: "generic",
    title: "Payload genérico",
    metrics: { _degraded: 1 },
    meta: { degraded: true, reason: `Módulo sin adaptador explícito: ${moduleId}` },
    raw: payload,
  } as FiferBoxDataNormalized);
}

export * from "./adapters/index";
