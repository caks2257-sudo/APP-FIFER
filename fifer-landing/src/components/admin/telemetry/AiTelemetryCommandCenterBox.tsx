"use client";

import type { TelemetryDashboardPayload } from "@/lib/admin/telemetry-dashboard-data";
import { AiTelemetryCommandCenter } from "@/components/admin/telemetry/AiTelemetryCommandCenter";

export type AiTelemetryCommandCenterBoxProps = {
  /** Compatible con `BoxProps.data` — payload serializado desde API/layout. */
  data?: TelemetryDashboardPayload | null;
  isLoading?: boolean;
};

/**
 * Shell listo para `BoxLoader` — sin navegación superior; solo grid de slots.
 */
export function AiTelemetryCommandCenterBox({ data, isLoading }: AiTelemetryCommandCenterBoxProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E] p-8 text-center text-sm text-zinc-500"
        data-fifer-box="ai-telemetry-command-center"
      >
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
        <p className="mt-4">Cargando AI Command Center…</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div
        className="rounded-[0.75rem] border border-[#EAB308]/30 bg-[#0A0F1E] p-6 text-sm text-amber-200/90"
        data-fifer-box="ai-telemetry-command-center"
      >
        Sin datos de telemetría. Hidrata <code className="text-zinc-400">data</code> con{" "}
        <code className="text-zinc-400">getTelemetryDashboardPayload()</code>.
      </div>
    );
  }
  return (
    <div data-fifer-box="ai-telemetry-command-center" className="w-full">
      <AiTelemetryCommandCenter payload={data} showNav={false} />
    </div>
  );
}
