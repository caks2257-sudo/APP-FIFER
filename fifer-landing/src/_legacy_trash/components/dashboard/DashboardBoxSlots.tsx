"use client";

import { useAppContext } from "@/context";
import { ContentDashboardBox } from "./ContentDashboardBox";
import { FinanceDashboardBox } from "./FinanceDashboardBox";
import { IngestorDashboardBox } from "./IngestorDashboardBox";

/**
 * Lienzo Grid (12 cols) — inyección de Fifer Boxes sin posiciones absolutas.
 * Visibilidad por `activeModule` (`AppContextProvider`): solo se montan los Boxes del módulo elegido
 * (o los tres si `all`). Cambio vía `setActiveModule` o `/dashboard?module=…` sin recarga completa.
 */
export function DashboardBoxSlots() {
  const { activeModule } = useAppContext();

  const showContent = activeModule === "all" || activeModule === "content";
  const showIngestor = activeModule === "all" || activeModule === "ingestor";
  const showFinance = activeModule === "all" || activeModule === "finance";

  return (
    <section aria-label="Micro-frontends FIFER" className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Módulos conectados
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Content, Ingestor y Finance consumen el mismo{" "}
          <code className="text-fifer-yellow">NEXT_PUBLIC_FIFER_API_BASE_URL</code> y token Supabase vía{" "}
          <code className="text-fifer-yellow">fifer-api.ts</code>.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {showContent ? <ContentDashboardBox /> : null}
        {showIngestor ? <IngestorDashboardBox /> : null}
        {showFinance ? <FinanceDashboardBox /> : null}
      </div>
    </section>
  );
}
