import React from "react";
import { FiferFinanceSnapshot } from "@/components/v0-ingestion/fifer-finance-snapshot";
import { getFinanceSnapshotData } from "@/lib/finance-snapshot-data";

export const dynamic = "force-dynamic";

export default async function FinanceDashboard() {
  /** Fase 4 E2E: sin API key el Gateway del motor Node responde 401 → candado en UI. */
  let snapshot: Awaited<ReturnType<typeof getFinanceSnapshotData>>;
  try {
    snapshot = await getFinanceSnapshotData(undefined);
  } catch (err) {
    console.error("[finance] getFinanceSnapshotData", err);
    snapshot = {
      data: null,
      isLocked: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }

  return (
    <main className="min-h-screen bg-[#050810] p-8 text-white">
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="font-fifer-heading text-3xl font-bold">Finance Hub</h1>
        <p className="mt-2 text-slate-400">
          Módulo nativo — hidratación vía motor Node (`GET /api/v2/engines/finance/cashflow/snapshot`)
        </p>
      </header>

      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <FiferFinanceSnapshot
            data={snapshot.data ?? undefined}
            isLocked={snapshot.isLocked}
            error={snapshot.error}
          />
        </div>
      </section>
    </main>
  );
}
