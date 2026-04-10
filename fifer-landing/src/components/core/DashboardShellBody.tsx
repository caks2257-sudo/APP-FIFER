"use client";

import { usePathname } from "next/navigation";
import { DashboardStatsRail } from "@/components/core/DashboardStatsRail";

/**
 * Canvas principal del dashboard: por defecto 8+4 (main + stats).
 * En `/mis-apps` el contenido ocupa 12 columnas para el layout Mis Apps (lista + orquestador).
 */
export function DashboardShellBody({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname() || "";
  const p = pathname.replace(/\/+$/, "") || "/";
  const fullWidthMain = p === "/mis-apps";

  if (fullWidthMain) {
    return <div className="col-span-12">{children}</div>;
  }

  return (
    <>
      <div className="col-span-12 rounded-[0.75rem] border border-[#EAB308]/15 bg-[#0A0F1E]/70 p-3 xl:col-span-8" data-slot="slot-main">
        {children}
      </div>
      <div
        className="col-span-12 grid grid-cols-12 gap-4 rounded-[0.75rem] border border-[#EAB308]/15 bg-[#0A0F1E]/55 p-3 xl:col-span-4"
        data-slot="slot-stats-grid"
      >
        <div className="col-span-12 rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E]/40 p-2">
          <DashboardStatsRail />
        </div>
      </div>
    </>
  );
}
