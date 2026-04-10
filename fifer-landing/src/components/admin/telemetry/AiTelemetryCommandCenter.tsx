"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Activity } from "lucide-react";
import type { TelemetryDashboardPayload } from "@/lib/admin/telemetry-dashboard-data";
import { AiArenaSlot } from "@/components/admin/telemetry/AiArenaSlot";
import { TelemetryKpiGrid } from "@/components/admin/telemetry/TelemetryKpiGrid";
import { LiveLogsTerminal } from "@/components/admin/telemetry/LiveLogsTerminal";

type Props = {
  payload: TelemetryDashboardPayload;
  showNav?: boolean;
};

/**
 * AI Command Center — layout 12 columnas (MASTER). Encaja en página `/admin/telemetry` o BoxLoader.
 */
export function AiTelemetryCommandCenter({ payload: initial, showNav = true }: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/telemetry-dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as TelemetryDashboardPayload;
      setPayload(next);
      router.refresh();
    } catch {
      setRefreshing(false);
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  return (
    <div
      className={
        showNav ? "min-h-screen bg-[#0A0F1E] text-zinc-100" : "w-full bg-transparent text-zinc-100"
      }
    >
      <div className={`mx-auto max-w-[1280px] px-4 ${showNav ? "py-8" : "py-2"}`}>
        {showNav ? (
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#EAB308]/20 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-[#EAB308]" aria-hidden />
              <div>
                <h1 className="font-fifer-heading text-xl font-bold text-zinc-50">AI Command Center</h1>
                <p className="text-xs text-zinc-500">
                  Actualizado {new Date(payload.asOfIso).toLocaleString("es-CL")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className="rounded-[0.75rem] border border-[#EAB308]/30 bg-[#EAB308]/10 px-4 py-2 text-sm font-medium text-[#EAB308] hover:bg-[#EAB308]/15 disabled:opacity-50"
              >
                {refreshing ? "Actualizando…" : "Refrescar datos"}
              </button>
              <Link
                href="/admin/ai-health"
                className="rounded-[0.75rem] border border-emerald-600/40 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-600/10"
              >
                AI Health
              </Link>
            </div>
          </header>
        ) : null}

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12">
            <AiArenaSlot arena={payload.arena} />
          </div>
          <div className="col-span-12">
            <TelemetryKpiGrid kpis={payload.kpis} costCurve={payload.costCurve} />
          </div>
          <div className="col-span-12">
            <LiveLogsTerminal logs={payload.liveLogs} integrations={payload.integrations} />
          </div>
        </div>
      </div>
    </div>
  );
}
