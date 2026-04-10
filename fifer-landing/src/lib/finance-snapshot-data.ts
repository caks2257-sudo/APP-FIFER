import { fetchFiferEngine } from "@/lib/fifer-api-client";

const FINANCE_CASHFLOW_SNAPSHOT = "/api/v2/engines/finance/cashflow/snapshot";

/** KPIs que consume `FiferFinanceSnapshot` en el dashboard. */
export type FinanceSnapshotKpis = { kpis: Array<{ label: string; value: number | string }> };

type EngineCashflowPayload = {
  message?: string;
  metrics?: { pending_uf?: number; cleared_clp?: number };
  kpis?: FinanceSnapshotKpis["kpis"];
};

function mapEnginePayloadToKpis(payload: EngineCashflowPayload | undefined | null): FinanceSnapshotKpis | null {
  if (!payload) return null;
  if (payload.kpis?.length) return { kpis: payload.kpis };
  const m = payload.metrics;
  if (m && (m.pending_uf !== undefined || m.cleared_clp !== undefined)) {
    return {
      kpis: [
        { label: "UF pendientes", value: m.pending_uf ?? 0 },
        { label: "CLP liquidados", value: m.cleared_clp ?? 0 },
      ],
    };
  }
  return null;
}

export type FinanceSnapshotLoadResult = {
  data: FinanceSnapshotKpis | null;
  isLocked: boolean;
  error: Error | null;
};

/**
 * Hidratación E2E del box `fifer-finance-snapshot` vía Engine Node + Gateway.
 * Sin `userApiKey` (o con llave rechazada) → `isLocked: true` para `BoxLockedOverlay`.
 */
export async function getFinanceSnapshotData(userApiKey?: string): Promise<FinanceSnapshotLoadResult> {
  const result = await fetchFiferEngine<EngineCashflowPayload>(FINANCE_CASHFLOW_SNAPSHOT, userApiKey);

  if (result.isLocked) {
    return {
      data: null,
      isLocked: true,
      error: null,
    };
  }

  if (result.error) {
    throw new Error(result.error);
  }

  const kpis = mapEnginePayloadToKpis(result.data);
  if (!kpis) {
    throw new Error("Respuesta del engine sin KPIs ni métricas reconocibles");
  }

  return {
    data: kpis,
    isLocked: false,
    error: null,
  };
}
