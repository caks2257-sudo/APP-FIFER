"use client";

import type { IntegrationHealthRow, MockTelemetryLogLine } from "@/lib/admin/integrations-health-mocks";

const YELLOW = "#EAB308";
const EMERALD = "#059669";

type Props = {
  logs: MockTelemetryLogLine[];
  integrations: IntegrationHealthRow[];
  className?: string;
};

function levelStyle(level: MockTelemetryLogLine["level"]): { color: string; prefix: string } {
  switch (level) {
    case "success":
      return { color: EMERALD, prefix: "OK " };
    case "warn":
      return { color: "#fbbf24", prefix: "WRN" };
    case "alert":
      return { color: YELLOW, prefix: "!" };
    default:
      return { color: "#94a3b8", prefix: "INF" };
  }
}

/**
 * [Slot-Main] Live logs estilo terminal + tabla integraciones (mock 04).
 */
export function LiveLogsTerminal({ logs, integrations, className = "" }: Props) {
  const sorted = [...logs].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <section
      className={`grid grid-cols-12 gap-3 ${className}`}
      data-fifer-slot="main"
      aria-label="Logs y discovery"
    >
      <div className="col-span-12 lg:col-span-7">
        <div className="rounded-[0.75rem] border border-[#EAB308]/20 bg-[#050810] p-4 font-mono text-xs">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Live logs &amp; discovery
            </span>
            <span className="text-[10px] text-zinc-600">fifer.telemetry.stream</span>
          </div>
          <ul className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pr-1 text-[11px] leading-relaxed">
            {sorted.map((line) => {
              const st = levelStyle(line.level);
              return (
                <li key={line.id} className="border-l-2 border-white/10 pl-2" style={{ borderLeftColor: st.color }}>
                  <span className="text-zinc-600">{new Date(line.at).toLocaleTimeString("es-CL")}</span>{" "}
                  <span style={{ color: st.color }}>[{st.prefix}]</span>{" "}
                  <span className="text-zinc-300">{line.message}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5">
        <div className="rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E]/95 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Integraciones (04_INTEGRATIONS_HEALTH)
          </h3>
          <ul className="mt-3 max-h-[min(420px,50vh)] space-y-2 overflow-y-auto text-[11px]">
            {integrations.map((row) => (
              <li
                key={row.service}
                className="rounded-lg border border-white/5 bg-black/20 px-2 py-2 text-zinc-400"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-200">{row.service}</span>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                    style={{
                      color:
                        row.status === "active"
                          ? EMERALD
                          : row.status === "warning"
                            ? YELLOW
                            : row.status === "ghost"
                              ? "#94a3b8"
                              : "#f87171",
                      backgroundColor: "rgba(255,255,255,0.04)",
                    }}
                  >
                    {row.status}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-zinc-600">{row.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
