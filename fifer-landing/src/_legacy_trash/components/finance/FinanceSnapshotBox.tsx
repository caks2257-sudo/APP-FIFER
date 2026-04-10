"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useFiferData } from "@/hooks/useFiferData";
import { fetchFinanceReport, type FinanceReportData } from "@/lib/fifer-api";

/**
 * Activa fallo simulado (JIT / prueba de aislamiento):
 * - URL: `?fifer_finance_fail=1` en la página del dashboard, o
 * - Consola: `sessionStorage.setItem('fifer_jit_finance_fail','1'); location.reload()`
 */
function shouldSimulateFinanceJitFailure(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get("fifer_finance_fail") === "1") return true;
    if (window.sessionStorage.getItem("fifer_jit_finance_fail") === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function FinanceSnapshotSkeleton() {
  return (
    <Card className="h-full border-slate-800/90 bg-slate-950/50">
      <CardHeader className="space-y-2 pb-2">
        <div className="h-4 w-36 animate-pulse rounded-md bg-slate-800" />
        <div className="h-3 w-full max-w-xs animate-pulse rounded bg-slate-800/80" />
      </CardHeader>
      <div className="space-y-2 px-6 pb-6">
        <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-800/90" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-900" />
      </div>
    </Card>
  );
}

/**
 * Box Finance — `useFiferData` + error → `BoxErrorBoundary`.
 */
export function FinanceSnapshotBox() {
  const { data, loading } = useFiferData<FinanceReportData>(
    async () => {
      if (shouldSimulateFinanceJitFailure()) {
        await new Promise((r) => setTimeout(r, 450));
        throw new Error("Simulación JIT: timeout / API no disponible");
      }
      const res = await fetchFinanceReport();
      if (!res.success || !res.data) {
        throw new Error(String(res.error || "No se pudo cargar el reporte financiero"));
      }
      return res.data;
    },
    []
  );

  if (loading || !data) {
    return <FinanceSnapshotSkeleton />;
  }

  return (
    <Card className="h-full border-zinc-800 bg-zinc-900/40">
      <CardHeader>
        <CardTitle className="text-base text-zinc-100">fifer-finance</CardTitle>
        <p className="text-xs font-normal text-zinc-500">
          JIT · <code className="text-fifer-yellow/90">GET /finance/report</code>
        </p>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        <p className="text-2xl font-semibold tabular-nums text-fifer-yellow">
          ${data.available_balance.toFixed(2)}
        </p>
        <p className="text-sm text-zinc-400">
          Saldo disponible (wallet). Ingresos acumulados:{" "}
          <span className="tabular-nums text-zinc-300">${data.total_revenue.toFixed(2)}</span>
        </p>
      </div>
    </Card>
  );
}
