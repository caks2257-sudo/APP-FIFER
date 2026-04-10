import {
  fetchAiCapabilities,
  fetchCampaignDrafts,
  fetchFinanceReport,
  fetchPlatformProfitRanking,
} from "@/lib/fifer-api";
import type { BoxProps } from "@/types/fifer-box";
import {
  buildDegradedNormalized,
  toBoxPropsData,
  routeApiResponseToFiferBoxData,
} from "@/utils/adapters";

/**
 * Conexión al API master según módulo / boxId.
 * No lanza por fallo HTTP lógico: devuelve `data` degradado para que el Shell siga renderizando.
 * Respuestas OK pasan por `routeApiResponseToFiferBoxData` (Zod + mapeo a contrato Box).
 */
export async function fetchRealBoxDataForBridge(moduleId: string, boxId: string): Promise<BoxProps["data"]> {
  try {
    const mod = moduleId.toLowerCase();
    const bid = boxId.toLowerCase();

    if (mod === "finance" || bid.includes("finance")) {
      const res = await fetchFinanceReport();
      if (!res.success) {
        return toBoxPropsData(
          buildDegradedNormalized("finance", "Finanzas", res.error || "Finance API error", {
            meta: { sourceHint: "fetchFinanceReport" },
          })
        );
      }
      return routeApiResponseToFiferBoxData(
        {
          title: "Finanzas",
          total: res.data?.available_balance,
          balance: res.data?.available_balance,
          currency: "USD",
          ...res.data,
        },
        mod,
        { boxId }
      ).data;
    }

    if (mod === "content" || bid.includes("content") || bid.includes("google-shopping")) {
      const res = await fetchAiCapabilities();
      if (!res.success) {
        return toBoxPropsData(
          buildDegradedNormalized("ai", "Capacidades IA · contenido", res.error || "AI capabilities error", {
            meta: { sourceHint: "fetchAiCapabilities" },
          })
        );
      }
      return routeApiResponseToFiferBoxData(res.data, mod, { boxId }).data;
    }

    if (mod === "affiliates" || bid.includes("affiliate")) {
      const res = await fetchPlatformProfitRanking();
      if (!res.success) {
        return toBoxPropsData(
          buildDegradedNormalized("generic", "Ranking plataformas", res.error || "Platform ranking error", {
            meta: { sourceHint: "fetchPlatformProfitRanking" },
          })
        );
      }
      return routeApiResponseToFiferBoxData(res.data, mod, { boxId }).data;
    }

    if (bid.includes("ingestor") || bid.includes("feed")) {
      const res = await fetchCampaignDrafts();
      if (!res.success) {
        return toBoxPropsData(
          buildDegradedNormalized("generic", "Borradores de campaña", res.error || "Campaign drafts error", {
            meta: { sourceHint: "fetchCampaignDrafts" },
          })
        );
      }
      return routeApiResponseToFiferBoxData(res.data, mod, { boxId }).data;
    }

    const res = await fetchFinanceReport();
    if (!res.success) {
      return toBoxPropsData(
        buildDegradedNormalized("finance", "Dashboard", res.error || "API error", {
          meta: { sourceHint: "fetchFinanceReport" },
        })
      );
    }
    return routeApiResponseToFiferBoxData(res.data ?? { title: "Dashboard" }, mod, { boxId }).data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return toBoxPropsData(
      buildDegradedNormalized("generic", "Datos", msg.slice(0, 280), {
        meta: { sourceHint: "fetchRealBoxDataForBridge" },
      })
    );
  }
}
